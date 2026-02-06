#!/usr/bin/env node
import * as cdk from "aws-cdk-lib";
import { NetworkStack } from "../../lib/stacks/network-stack";
import { IamStack } from "../../lib/stacks/iam-stack";
import { SecurityStack } from "../../lib/stacks/security-stack";
import { S3Stack } from "../../lib/stacks/s3-stack";
import { SqsStack } from "../../lib/stacks/sqs-stack";
import { SsmStack } from "../../lib/stacks/ssm-stack";
import { CloudfrontStack } from "../../lib/stacks/cloudfront-stack";
import { EcsClusterStack } from "../../lib/stacks/ecs-cluster-stack";
import { EcsWorkerStack } from "../../lib/stacks/ecs-task-definition-stack";
import { DatabaseStack } from "../../lib/stacks/database-stack";
import { ENV } from "../../lib/shared/environment";

const app = new cdk.App();

const stackEnv = {
  account: ENV.account,
  region: ENV.region,
};

/* ---------------- NETWORK ---------------- */
const networkStack = new NetworkStack(app, "EdtvNetworkStack", {
  env: stackEnv,
  envName: ENV.name,
});

/* ---------------- SECURITY ---------------- */
const securityStack = new SecurityStack(app, "EdtvSecurityStack", {
  env: stackEnv,
  vpc: networkStack.vpc,
  envName: ENV.name,
});

/* ---------------- ECS CLUSTER ---------------- */
new EcsClusterStack(app, "EdtvEcsClusterStack", {
  env: stackEnv,
  vpc: networkStack.vpc,
  envName: ENV.name,
});

/* ---------------- IAM ---------------- */
new IamStack(app, "EdtvIamStack", {
  env: stackEnv,
  envName: ENV.name,
});

/* ---------------- S3 ---------------- */
const s3Stack = new S3Stack(app, "EdtvS3Stack", {
  env: stackEnv,
  envName: ENV.name,
});

/* ---------------- SQS ---------------- */
const sqsStack = new SqsStack(app, "EdtvSqsStack", {
  env: stackEnv,
  envName: ENV.name,
});

/* ---------------- SSM ---------------- */
new SsmStack(app, "EdtvSsmStack", {
  env: stackEnv,
  envName: ENV.name,
});

/* ---------------- DATABASE (RDS + SECRET) ---------------- */
const databaseStack = new DatabaseStack(app, "EdtvDatabaseStack", {
  env: stackEnv,
  vpc: networkStack.vpc,
  envName: ENV.name,
  ecsSecurityGroup: securityStack.ecsSG,
});

/* ---------------- ECS TASK DEFINITION (WORKER) ---------------- */
new EcsWorkerStack(app, "EdtvEcsWorkerStack", {
  env: stackEnv,
  envName: ENV.name,
  queue: sqsStack.queue,
  dbSecret: databaseStack.dbSecret, // 
});

/* ---------------- CLOUDFRONT ---------------- */
new CloudfrontStack(app, "EdtvCloudFrontStack", {
  env: stackEnv,
  envName: ENV.name,
  processedBucket: s3Stack.targetBucket,
});

/* ---------------- OUTPUTS ---------------- */
new cdk.CfnOutput(networkStack, "VpcIdOutput", {
  value: networkStack.vpc.vpcId,
});

new cdk.CfnOutput(securityStack, "EcsSecurityGroupIdOutput", {
  value: securityStack.ecsSG.securityGroupId,
});

new cdk.CfnOutput(securityStack, "LambdaSecurityGroupIdOutput", {
  value: securityStack.lambdaSG.securityGroupId,
});

new cdk.CfnOutput(s3Stack, "MediaBucketNameOutput", {
  value: s3Stack.sourceBucket.bucketName,
});

new cdk.CfnOutput(s3Stack, "ProcessedBucketNameOutput", {
  value: s3Stack.targetBucket.bucketName,
});
