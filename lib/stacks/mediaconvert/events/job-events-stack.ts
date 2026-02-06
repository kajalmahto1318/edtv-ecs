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

    /* -------------------------------------------------
     * SNS TOPIC (MediaConvert job events)
     * ------------------------------------------------- */
    this.jobEventsTopic = new sns.Topic(this, "MediaConvertJobEventsTopic", {
      topicName: `edtv-mediaconvert-events-${envName}`,
    });

    /* -------------------------------------------------
     * EVENTBRIDGE RULE
     * ------------------------------------------------- */
    new events.Rule(this, "MediaConvertJobStateChangeRule", {
      ruleName: `edtv-mediaconvert-job-state-${envName}`,
      description: "Capture MediaConvert job COMPLETE / ERROR events",
      eventPattern: {
        source: ["aws.mediaconvert"],
        detailType: ["MediaConvert Job State Change"],
        detail: {
          status: ["COMPLETE", "ERROR"],
        },
      },
      targets: [new targets.SnsTopic(this.jobEventsTopic)],
    });
  }
}
