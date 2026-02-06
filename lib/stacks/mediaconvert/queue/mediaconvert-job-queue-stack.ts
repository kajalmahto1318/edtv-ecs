import * as cdk from "aws-cdk-lib";
import { Construct } from "constructs";
import * as sqs from "aws-cdk-lib/aws-sqs";

export interface MediaConvertJobQueueStackProps extends cdk.StackProps {
  envName: string;
}

export class MediaConvertJobQueueStack extends cdk.Stack {
  public readonly jobQueue: sqs.Queue;
  public readonly deadLetterQueue: sqs.Queue;

  constructor(
    scope: Construct,
    id: string,
    props: MediaConvertJobQueueStackProps
  ) {
    super(scope, id, props);

    const { envName } = props;

    this.deadLetterQueue = new sqs.Queue(this, "MediaConvertDLQ", {
      queueName: `Edtv-MediaConvert-DLQ-${envName}`,
      retentionPeriod: cdk.Duration.days(14),
    });

    this.jobQueue = new sqs.Queue(this, "MediaConvertJobQueue", {
      queueName: `Edtv-MediaConvert-Queue-${envName}`,
      visibilityTimeout: cdk.Duration.minutes(5),
      deadLetterQueue: {
        queue: this.deadLetterQueue,
        maxReceiveCount: 3,
      },
    });

    new cdk.CfnOutput(this, "MediaConvertQueueUrl", {
      value: this.jobQueue.queueUrl,
    });
  }
}
