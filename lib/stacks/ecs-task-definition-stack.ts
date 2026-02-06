import * as cdk from "aws-cdk-lib";
import { Construct } from "constructs";
import * as ecs from "aws-cdk-lib/aws-ecs";
import * as iam from "aws-cdk-lib/aws-iam";
import * as sqs from "aws-cdk-lib/aws-sqs";
import * as logs from "aws-cdk-lib/aws-logs";

export interface EcsWorkerStackProps extends cdk.StackProps {
  envName: string;
  queue: sqs.IQueue;
}

export class EcsWorkerStack extends cdk.Stack {
  public readonly taskDefinition: ecs.FargateTaskDefinition;

  constructor(scope: Construct, id: string, props: EcsWorkerStackProps) {
    super(scope, id, props);

    /* ---------------- TASK ROLE ---------------- */
    const taskRole = new iam.Role(this, "WorkerTaskRole", {
      assumedBy: new iam.ServicePrincipal("ecs-tasks.amazonaws.com"),
    });

    // SQS permissions
    props.queue.grantConsumeMessages(taskRole);

    // MediaConvert permissions
    taskRole.addManagedPolicy(
      iam.ManagedPolicy.fromAwsManagedPolicyName(
        "AmazonElasticTranscoder_FullAccess",
      ),
    );

    /* ---------------- TASK DEFINITION ---------------- */
    this.taskDefinition = new ecs.FargateTaskDefinition(
      this,
      "WorkerTaskDefinition",
      {
        cpu: 1024,
        memoryLimitMiB: 2048,
        taskRole,
      },
    );

    this.taskDefinition.addContainer("WorkerContainer", {
      image: ecs.ContainerImage.fromRegistry(
        "public.ecr.aws/docker/library/node:18",
      ),
      logging: ecs.LogDrivers.awsLogs({
        logGroup: new logs.LogGroup(this, "WorkerLogs", {
          logGroupName: `/ecs/edtv-worker-${props.envName}`,
          retention: logs.RetentionDays.ONE_WEEK,
        }),
        streamPrefix: "worker",
      }),
      environment: {
        ENV_NAME: props.envName,
        QUEUE_URL: props.queue.queueUrl,
        AWS_REGION: cdk.Stack.of(this).region,
      },
    });
  }
}
