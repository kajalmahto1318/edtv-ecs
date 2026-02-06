import AWS from "aws-sdk";

const sqs = new AWS.SQS({ region: process.env.AWS_REGION });
const dynamodb = new AWS.DynamoDB.DocumentClient({ region: process.env.AWS_REGION });

export async function handler(event) {
  console.log("Lambda event received:", JSON.stringify(event, null, 2));

  for (const record of event.Records) {
    const body = JSON.parse(record.body);
    const jobId = body.jobId;
    const status = body.status;

    console.log(`Updating job ${jobId} to status ${status}`);

    const params = {
      TableName: process.env.JOB_STATUS_TABLE,
      Key: { jobId },
      UpdateExpression: "SET #status = :status",
      ExpressionAttributeNames: { "#status": "status" },
      ExpressionAttributeValues: { ":status": status }
    };

    try {
      await dynamodb.update(params).promise();
      console.log(`Job ${jobId} status updated successfully`);
    } catch (err) {
      console.error("Error updating job status:", err);
    }
  }
}

// Local test
if (process.env.NODE_ENV === "local") {
  handler({ Records: [] }).then(() => console.log("Test run complete"));
}
