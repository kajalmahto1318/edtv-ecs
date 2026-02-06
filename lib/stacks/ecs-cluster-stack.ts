import * as cdk from "aws-cdk-lib";
import { Construct } from "constructs";
import * as ecs from "aws-cdk-lib/aws-ecs";
import * as ec2 from "aws-cdk-lib/aws-ec2";
import { hasUncaughtExceptionCaptureCallback } from "process";
import { KMS_REDUCE_CROSS_ACCOUNT_REGION_POLICY_SCOPE } from "aws-cdk-lib/cx-api";

export interface EcsClusterStackProps extends cdk.StackProps {
  vpc: ec2.IVpc;
  envName: string;
}

export class EcsClusterStack extends cdk.Stack {
  public readonly cluster: ecs.Cluster;

  constructor(scope: Construct, id: string, props: EcsClusterStackProps) {
    super(scope, id, props);

    this.cluster = new ecs.Cluster(this, "EdtvCluster", {
      clusterName: `edtv-ecs-cluster-${props.envName}`,
      vpc: props.vpc,
      containerInsights: true, // production must-have
    });
  }
}


