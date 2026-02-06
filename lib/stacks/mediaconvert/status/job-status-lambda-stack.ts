import * as cdk from "aws-cdk-lib";
import { Construct } from "constructs";
import * as lambda from "aws-cdk-lib/aws-lambda";
import * as iam from "aws-cdk-lib/aws-iam";
import * as sns from "aws-cdk-lib/aws-sns";
import * as subs from "aws-cdk-lib/aws-sns-subscriptions";
import * as path from "path";
import { NodejsFunction } from "aws-cdk-lib/aws-lambda-nodejs";

export interface MediaConvertJobStatusLambdaStackProps
  extends cdk.StackProps {
  envName: string;
  jobEventsTopic: sns.ITopic;
  alertTopic: sns.ITopic;
  dbConnectionString: string;
}

export class MediaConvertJobStatusLambdaStack extends cdk.Stack {
  public readonly statusLambda: lambda.Function;

  constructor(
    scope: Construct,
    id: string,
    props: MediaConvertJobStatusLambdaStackProps
  ) {
    super(scope, id, props);

    const { envName, jobEventsTopic, alertTopic, dbConnectionString } = props;

    const role = new iam.Role(this, "MCStatusLambdaRole", {
      assumedBy: new iam.ServicePrincipal("lambda.amazonaws.com"),
      managedPolicies: [
        iam.ManagedPolicy.fromAwsManagedPolicyName(
          "service-role/AWSLambdaBasicExecutionRole"
        ),
      ],
    });

    alertTopic.grantPublish(role);

    this.statusLambda = new NodejsFunction(this, "MCJobStatusLambda", {
      functionName: `edtv-mc-job-status-${envName}`,
      runtime: lambda.Runtime.NODEJS_22_X,
      entry: path.join(
        __dirname,
        "../../../../lambda/edtv-job-status-handler/index.ts"
      ),
      handler: "handler",
      role,
      timeout: cdk.Duration.seconds(30),
      memorySize: 512,
      environment: {
        ENV_NAME: envName,
        DB_CONNECTION_STRING: dbConnectionString,
        ALERT_TOPIC_ARN: alertTopic.topicArn,
      },
    });

    jobEventsTopic.addSubscription(
      new subs.LambdaSubscription(this.statusLambda)
    );
  }
}
