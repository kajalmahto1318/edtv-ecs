import AWS from "aws-sdk";

const sqs = new AWS.SQS({ region: process.env.AWS_REGION });
const mediaconvert = new AWS.MediaConvert({
  endpoint: process.env.MEDIACONVERT_ENDPOINT,
  region: process.env.AWS_REGION,
});

const QUEUE_URL = process.env.QUEUE_URL;

async function pollQueue() {
  while (true) {
    const resp = await sqs
      .receiveMessage({
        QueueUrl: QUEUE_URL,
        MaxNumberOfMessages: 1,
        WaitTimeSeconds: 20,
      })
      .promise();

    if (!resp.Messages) continue;

    for (const msg of resp.Messages) {
      const body = JSON.parse(msg.Body);

      await mediaconvert
        .createJob({
          Role: process.env.MEDIACONVERT_ROLE_ARN,
          Settings: {
            Inputs: [{ FileInput: `s3://${body.bucket}/${body.key}` }],
            OutputGroups: [
              {
                OutputGroupSettings: {
                  Type: "FILE_GROUP_SETTINGS",
                  FileGroupSettings: {
                    Destination: `s3://${body.outputBucket}/${body.jobId}/`,
                  },
                },
              },
            ],
          },
        })
        .promise();

      await sqs
        .deleteMessage({
          QueueUrl: QUEUE_URL,
          ReceiptHandle: msg.ReceiptHandle,
        })
        .promise();
    }
  }
}

pollQueue().catch(console.error);
