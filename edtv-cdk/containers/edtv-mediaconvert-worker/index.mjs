import AWS from "aws-sdk";

// AWS SDK clients
const sqs = new AWS.SQS({ region: process.env.AWS_REGION });
const s3 = new AWS.S3();
const mediaconvert = new AWS.MediaConvert({
  endpoint: process.env.MEDIACONVERT_ENDPOINT,
  region: process.env.AWS_REGION
});

// Lambda-style handler for ECS (can be invoked manually or via SQS trigger)
export async function handler(event) {
  console.log("Received event:", JSON.stringify(event, null, 2));

  for (const record of event.Records) {
    const body = JSON.parse(record.body);
    const inputKey = body.inputKey;
    const outputKey = body.outputKey;
    const bucket = body.bucket;

    console.log(`Processing file: s3://${bucket}/${inputKey} -> ${outputKey}`);

    const params = {
      Role: process.env.MEDIACONVERT_ROLE_ARN,
      Settings: {
        Inputs: [{ FileInput: `s3://${bucket}/${inputKey}` }],
        OutputGroups: [
          {
            Name: "File Group",
            OutputGroupSettings: {
              Type: "FILE_GROUP_SETTINGS",
              FileGroupSettings: { Destination: `s3://${bucket}/${outputKey}/` }
            },
            Outputs: [
              {
                ContainerSettings: { Container: "MP4" }
              }
            ]
          }
        ]
      }
    };

    try {
      const result = await mediaconvert.createJob(params).promise();
      console.log("MediaConvert job created:", result.Job.Id);
    } catch (err) {
      console.error("Error creating MediaConvert job:", err);
    }
  }
}

// If running directly (for local testing)
if (process.env.NODE_ENV === "local") {
  handler({ Records: [] }).then(() => console.log("Test run complete"));
}
