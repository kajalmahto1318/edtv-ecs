import AWS from "aws-sdk";

/* -------------------------------------------------
 * ENV VARIABLES
 * ------------------------------------------------- */
const REGION = process.env.AWS_REGION;
const QUEUE_URL = process.env.QUEUE_URL;
const MEDIACONVERT_ROLE_ARN = process.env.MEDIACONVERT_ROLE_ARN;
const MEDIACONVERT_ENDPOINT = process.env.MEDIACONVERT_ENDPOINT;

if (!REGION || !QUEUE_URL || !MEDIACONVERT_ROLE_ARN || !MEDIACONVERT_ENDPOINT) {
  throw new Error("❌ Missing required environment variables");
}

/* -------------------------------------------------
 * AWS CLIENTS
 * ------------------------------------------------- */
const sqs = new AWS.SQS({ region: REGION });

const mediaconvert = new AWS.MediaConvert({
  region: REGION,
  endpoint: MEDIACONVERT_ENDPOINT,
});

/* -------------------------------------------------
 * UTILS
 * ------------------------------------------------- */
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

/* -------------------------------------------------
 * PROCESS SINGLE SQS MESSAGE
 * ------------------------------------------------- */
async function processMessage(message) {
  if (!message.Body || !message.ReceiptHandle) return;

  let payload;

  try {
    payload = JSON.parse(message.Body);

    // If SNS → SQS wrapped message
    if (payload.Message) {
      payload = JSON.parse(payload.Message);
    }
  } catch (err) {
    console.error("❌ Invalid message body", err);
    return;
  }

  const { bucket, key, outputBucket, jobId } = payload;

  if (!bucket || !key || !outputBucket || !jobId) {
    throw new Error("❌ Invalid MediaConvert job payload");
  }

  console.log(`🎬 Creating MediaConvert job for: ${key}`);

  await mediaconvert
    .createJob({
      Role: MEDIACONVERT_ROLE_ARN,
      Settings: {
        Inputs: [
          {
            FileInput: `s3://${bucket}/${key}`,
          },
        ],
        OutputGroups: [
          {
            Name: "MP4 File Group",
            OutputGroupSettings: {
              Type: "FILE_GROUP_SETTINGS",
              FileGroupSettings: {
                Destination: `s3://${outputBucket}/${jobId}/`,
              },
            },
            Outputs: [
              {
                ContainerSettings: {
                  Container: "MP4",
                },
                VideoDescription: {
                  CodecSettings: {
                    Codec: "H_264",
                    H264Settings: {
                      RateControlMode: "CBR",
                      Bitrate: 5000000,
                    },
                  },
                },
                AudioDescriptions: [
                  {
                    CodecSettings: {
                      Codec: "AAC",
                      AacSettings: {
                        Bitrate: 96000,
                        CodingMode: "CODING_MODE_2_0",
                        SampleRate: 48000,
                      },
                    },
                  },
                ],
              },
            ],
          },
        ],
      },
    })
    .promise();

  await sqs
    .deleteMessage({
      QueueUrl: QUEUE_URL,
      ReceiptHandle: message.ReceiptHandle,
    })
    .promise();

  console.log("✅ MediaConvert job submitted & message deleted");
}

/* -------------------------------------------------
 * SQS POLLER (MAIN LOOP)
 * ------------------------------------------------- */
async function pollQueue() {
  console.log("🚀 MediaConvert ECS worker started");

  while (true) {
    try {
      const response = await sqs
        .receiveMessage({
          QueueUrl: QUEUE_URL,
          MaxNumberOfMessages: 1,
          WaitTimeSeconds: 20,
          VisibilityTimeout: 300,
        })
        .promise();

      if (!response.Messages || response.Messages.length === 0) {
        continue;
      }

      for (const message of response.Messages) {
        try {
          await processMessage(message);
        } catch (err) {
          console.error("❌ Job failed, message will retry (DLQ safe)", err);
          // ❌ DO NOT delete message on failure
        }
      }
    } catch (err) {
      console.error("❌ Polling error", err);
      await sleep(5000);
    }
  }
}

/* -------------------------------------------------
 * GRACEFUL SHUTDOWN
 * ------------------------------------------------- */
process.on("SIGTERM", () => {
  console.log("🛑 SIGTERM received, shutting down worker...");
  process.exit(0);
});

/* -------------------------------------------------
 * START WORKER
 * ------------------------------------------------- */
pollQueue();
