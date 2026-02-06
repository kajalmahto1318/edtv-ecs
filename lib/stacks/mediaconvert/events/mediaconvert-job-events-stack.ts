import * as cdk from "aws-cdk-lib";
import { Construct } from "constructs";
import * as events from "aws-cdk-lib/aws-events";
import * as targets from "aws-cdk-lib/aws-events-targets";
import * as sns from "aws-cdk-lib/aws-sns";

export interface MediaConvertJobEventsStackProps extends cdk.StackProps {
  envName: string;
}

export class MediaConvertJobEventsStack extends cdk.Stack {
  public readonly jobEventsTopic: sns.Topic;

  constructor(
    scope: Construct,
    id: string,
    props: MediaConvertJobEventsStackProps
  ) {
    super(scope, id, props);

    const { envName } = props;

    this.jobEventsTopic = new sns.Topic(this, "JobEventsTopic", {
      topicName: `Edtv-MC-JobEvents-${envName}`,
    });

    new events.Rule(this, "MediaConvertJobStateRule", {
      ruleName: `Edtv-MC-JobState-${envName}`,
      eventPattern: {
        source: ["aws.mediaconvert"],
        detailType: ["MediaConvert Job State Change"],
        detail: { status: ["COMPLETE", "ERROR"] },
      },
      targets: [new targets.SnsTopic(this.jobEventsTopic)],
    });
  }
}
