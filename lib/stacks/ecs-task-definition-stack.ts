import * as cdk from "aws-cdk-lib";
import { Construct } from "constructs";
import * as ecs from "aws-cdk-lib/aws-ecs";
import * as iam from "aws-cdk-lib/aws-iam";
import * as sqs from "aws-cdk-lib/aws-sqs";
import * as logs from "aws-cdk-lib/aws-logs";
import * as path from "path";

export interface EcsTaskDefinitionStackProps extends cdk.StackProps {
  envName: string;
  queue: sqs.IQueue;
  mediaConvertRoleArn: string;
  mediaConvertEndpoint: string;
}

export class EcsTaskDefinitionStack extends cdk.Stack {
  public readonly taskDefinition: ecs.FargateTaskDefinition;

  constructor(
    scope: Construct,
    id: string,
    props: EcsTaskDefinitionStackProps,
  ) {
    super(scope, id, props);

    /* ---------------- TASK ROLE ---------------- */
    const taskRole = new iam.Role(this, "EcsWorkerTaskRole", {
      assumedBy: new iam.ServicePrincipal("ecs-tasks.amazonaws.com"),
    });

    // SQS
    taskRole.addToPolicy(
      new iam.PolicyStatement({
        actions: [
          "sqs:ReceiveMessage",
          "sqs:DeleteMessage",
          "sqs:GetQueueAttributes",
        ],
        resources: [props.queue.queueArn],
      }),
    );

    // MediaConvert
    taskRole.addToPolicy(
      new iam.PolicyStatement({
        actions: [
          "mediaconvert:CreateJob",
          "mediaconvert:GetJob",
          "mediaconvert:DescribeEndpoints",
        ],
        resources: ["*"],
      }),
    );

    // 🔥 REQUIRED
    taskRole.addToPolicy(
      new iam.PolicyStatement({
        actions: ["iam:PassRole"],
        resources: [props.mediaConvertRoleArn],
      }),
    );

    /* ---------------- EXECUTION ROLE ---------------- */
    const executionRole = new iam.Role(this, "EcsWorkerExecutionRole", {
      assumedBy: new iam.ServicePrincipal("ecs-tasks.amazonaws.com"),
      managedPolicies: [
        iam.ManagedPolicy.fromAwsManagedPolicyName(
          "service-role/AmazonECSTaskExecutionRolePolicy",
        ),
      ],
    });

    /* ---------------- TASK DEFINITION ---------------- */
    this.taskDefinition = new ecs.FargateTaskDefinition(
      this,
      "EcsWorkerTaskDefinition",
      {
        cpu: 1024,
        memoryLimitMiB: 2048,
        taskRole,
        executionRole,
      },
    );

    /* ---------------- CONTAINER ---------------- */
    this.taskDefinition.addContainer("EcsWorkerContainer", {
      image: ecs.ContainerImage.fromAsset(
        path.join(
          __dirname,
          "../../../edtv-ecs/edtv-cdk/containers/edtv-mediaconvert-worker",
        ),
      ),
      logging: ecs.LogDrivers.awsLogs({
        logGroup: new logs.LogGroup(this, "EcsWorkerLogs", {
          logGroupName: `/ecs/edtv-worker-${props.envName}`,
          retention: logs.RetentionDays.ONE_WEEK,
          removalPolicy: cdk.RemovalPolicy.DESTROY,
        }),
        streamPrefix: "worker",
      }),
      environment: {
        ENV_NAME: props.envName,
        AWS_REGION: cdk.Stack.of(this).region,
        QUEUE_URL: props.queue.queueUrl,
        MEDIACONVERT_ROLE_ARN: props.mediaConvertRoleArn,
        MEDIACONVERT_ENDPOINT: props.mediaConvertEndpoint,
      },
    });
  }
}
