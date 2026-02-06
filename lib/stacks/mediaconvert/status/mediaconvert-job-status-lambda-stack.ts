import * as cdk from "aws-cdk-lib";
import { Construct } from "constructs";
import * as lambda from "aws-cdk-lib/aws-lambda";
import * as iam from "aws-cdk-lib/aws-iam";
import * as ec2 from "aws-cdk-lib/aws-ec2";
import * as sns from "aws-cdk-lib/aws-sns";
import * as subs from "aws-cdk-lib/aws-sns-subscriptions";
import * as path from "path";
import { NodejsFunction } from "aws-cdk-lib/aws-lambda-nodejs";

export interface MediaConvertJobStatusLambdaStackProps
  extends cdk.StackProps {
  envName: string;

  // Infra
  vpc: ec2.IVpc;
  lambdaSecurityGroup: ec2.ISecurityGroup;

  // Events
  jobEventsTopic: sns.ITopic;
  alertTopic: sns.ITopic;

  // DB
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

    const {
      envName,
      vpc,
      lambdaSecurityGroup,
      jobEventsTopic,
      alertTopic,
      dbConnectionString,
    } = props;

    /* -------------------------------------------------
     * IAM ROLE
     * ------------------------------------------------- */
    const statusLambdaRole = new iam.Role(this, "MediaConvertStatusLambdaRole", {
      roleName: `Edtv-MC-Job-Status-Lambda-${envName}`,
      assumedBy: new iam.ServicePrincipal("lambda.amazonaws.com"),
      managedPolicies: [
        iam.ManagedPolicy.fromAwsManagedPolicyName(
          "service-role/AWSLambdaBasicExecutionRole"
        ),
      ],
    });

    // Allow publishing alerts
    alertTopic.grantPublish(statusLambdaRole);

    /* -------------------------------------------------
     * LAMBDA FUNCTION
     * ------------------------------------------------- */
    this.statusLambda = new NodejsFunction(
      this,
      "MediaConvertJobStatusHandler",
      {
        functionName: `edtv-mc-job-status-${envName}`,
        runtime: lambda.Runtime.NODEJS_22_X,
        entry: path.join(
          __dirname,
          "../../../../lambda/edtv-job-status-handler/index.ts"
        ),
        handler: "handler",
        memorySize: 512,
        timeout: cdk.Duration.seconds(30),

        role: statusLambdaRole,

        vpc,
        securityGroups: [lambdaSecurityGroup],

        environment: {
          ENV_NAME: envName,
          RDS_CONNECTION_STRING: dbConnectionString,
          ALERT_TOPIC_ARN: alertTopic.topicArn,
        },

        bundling: {
          externalModules: ["aws-sdk"],
        },
      }
    );

    /* -------------------------------------------------
     * SNS → LAMBDA SUBSCRIPTION
     * ------------------------------------------------- */
    jobEventsTopic.addSubscription(
      new subs.LambdaSubscription(this.statusLambda)
    );

    /* -------------------------------------------------
     * OUTPUTS
     * ------------------------------------------------- */
    new cdk.CfnOutput(this, "MediaConvertStatusLambdaName", {
      value: this.statusLambda.functionName,
    });

    new cdk.CfnOutput(this, "MediaConvertStatusLambdaArn", {
      value: this.statusLambda.functionArn,
    });
  }
}
