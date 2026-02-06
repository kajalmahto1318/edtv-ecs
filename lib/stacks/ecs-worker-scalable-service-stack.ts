import * as cdk from "aws-cdk-lib";
import { Construct } from "constructs";
import * as ecs from "aws-cdk-lib/aws-ecs";
import * as ec2 from "aws-cdk-lib/aws-ec2";
import * as sqs from "aws-cdk-lib/aws-sqs";

export interface EcsWorkerServiceStackProps extends cdk.StackProps {
  cluster: ecs.ICluster;
  vpc: ec2.IVpc;
  queue: sqs.IQueue;
  envName: string;
  taskDefinition: ecs.FargateTaskDefinition;
}

export class EcsWorkerServiceStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props: EcsWorkerServiceStackProps) {
    super(scope, id, props);

    /* -----------------------------------------------------
     * ECS SERVICE (uses EXISTING task definition)
     * ----------------------------------------------------- */
    const service = new ecs.FargateService(this, "WorkerService", {
      cluster: props.cluster,
      serviceName: `edtv-worker-service-${props.envName}`,
      taskDefinition: props.taskDefinition,
      desiredCount: 0, // IMPORTANT for SQS workers
      assignPublicIp: false,
      vpcSubnets: {
        subnetType: ec2.SubnetType.PRIVATE_WITH_EGRESS,
      },
    });

    /* -----------------------------------------------------
     * AUTO SCALING (SQS BASED)
     * ----------------------------------------------------- */
    const scaling = service.autoScaleTaskCount({
      minCapacity: 0,
      maxCapacity: 20,
    });

    scaling.scaleOnMetric("SqsBacklogScaling", {
      metric: props.queue.metricApproximateNumberOfMessagesVisible(),
      scalingSteps: [
        { upper: 0, change: 0 },
        { lower: 1, upper: 5, change: +1 },
        { lower: 6, upper: 20, change: +5 },
        { lower: 21, change: +10 },
      ],
      adjustmentType:
        cdk.aws_applicationautoscaling.AdjustmentType.CHANGE_IN_CAPACITY,
      cooldown: cdk.Duration.seconds(60),
    });
  }
}
