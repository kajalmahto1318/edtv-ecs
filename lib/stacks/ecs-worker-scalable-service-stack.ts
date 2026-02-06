import * as cdk from "aws-cdk-lib";
import { Construct } from "constructs";
import * as ecs from "aws-cdk-lib/aws-ecs";
import * as ec2 from "aws-cdk-lib/aws-ec2";
import * as sqs from "aws-cdk-lib/aws-sqs";
import * as iam from "aws-cdk-lib/aws-iam";
import * as logs from "aws-cdk-lib/aws-logs";

export interface EcsWorkerServiceStackProps extends cdk.StackProps {
  cluster: ecs.ICluster;
  vpc: ec2.IVpc;
  queue: sqs.IQueue;
  envName: string;
}

export class EcsWorkerServiceStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props: EcsWorkerServiceStackProps) {
    super(scope, id, props);

    /* -----------------------------------------------------
     * TASK ROLE (permissions inside container)
     * ----------------------------------------------------- */
    const taskRole = new iam.Role(this, "WorkerTaskRole", {
      assumedBy: new iam.ServicePrincipal("ecs-tasks.amazonaws.com"),
    });

    // SQS access
    props.queue.grantConsumeMessages(taskRole);

    // MediaConvert access
    taskRole.addManagedPolicy(
      iam.ManagedPolicy.fromAwsManagedPolicyName(
        "AmazonElasticTranscoder_FullAccess"
      )
    );

    /* -----------------------------------------------------
     * TASK DEFINITION
     * ----------------------------------------------------- */
    const taskDefinition = new ecs.FargateTaskDefinition(
      this,
      "WorkerTaskDef",
      {
        cpu: 1024,
        memoryLimitMiB: 2048,
        taskRole,
      }
    );

    taskDefinition.addContainer("WorkerContainer", {
      image: ecs.ContainerImage.fromRegistry(
        "public.ecr.aws/docker/library/node:18"
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

    /* -----------------------------------------------------
     * ECS SERVICE
     * ----------------------------------------------------- */
    const service = new ecs.FargateService(this, "WorkerService", {
      cluster: props.cluster,
      serviceName: `edtv-worker-service-${props.envName}`,
      taskDefinition,
      desiredCount: 1,
      assignPublicIp: false,
      vpcSubnets: {
        subnetType: ec2.SubnetType.PRIVATE_WITH_EGRESS,
      },
    });

    /* -----------------------------------------------------
     * AUTO SCALING (SQS BASED)
     * ----------------------------------------------------- */
    const scaling = service.autoScaleTaskCount({
      minCapacity: 1,
      maxCapacity: 20,
    });

    scaling.scaleOnMetric("SqsQueueScaling", {
      metric: props.queue.metricApproximateNumberOfMessagesVisible(),
      scalingSteps: [
        { upper: 0, change: -1 },
        { lower: 1, upper: 5, change: +1 },
        { lower: 6, upper: 20, change: +5 },
        { lower: 21, change: +10 },
      ],
      adjustmentType: cdk.aws_applicationautoscaling.AdjustmentType.CHANGE_IN_CAPACITY,
      cooldown: cdk.Duration.seconds(60),
    });
  }
}
