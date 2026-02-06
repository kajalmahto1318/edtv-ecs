import * as cdk from "aws-cdk-lib";
import { Construct } from "constructs";
import * as sqs from "aws-cdk-lib/aws-sqs";
import { applyEdtvTags } from "../shared/tags";

export interface SqsStackProps extends cdk.StackProps {
  envName: string;
}

export class SqsStack extends cdk.Stack {
  public readonly queue: sqs.Queue;
  public readonly dlq: sqs.Queue;

  constructor(scope: Construct, id: string, props: SqsStackProps) {
    super(scope, id, props);

    const { envName } = props;

    this.dlq = new sqs.Queue(this, "MediaConvertDLQ", {
      queueName: `Edtv-MediaConvert-DLQ-${envName}`,
      retentionPeriod: cdk.Duration.days(14),
    });

    this.queue = new sqs.Queue(this, "MediaConvertQueue", {
      queueName: `Edtv-MediaConvert-Queue-${envName}`,
      visibilityTimeout: cdk.Duration.minutes(5),
      deadLetterQueue: {
        queue: this.dlq,
        maxReceiveCount: 3,
      },
    });

    applyEdtvTags(this.queue, "Edtv-MediaConvert-Queue", envName);
    applyEdtvTags(this.dlq, "Edtv-MediaConvert-DLQ", envName);
  }
}
