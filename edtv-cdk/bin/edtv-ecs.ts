#!/usr/bin/env node
import * as cdk from "aws-cdk-lib";
import { NetworkStack } from "../../lib/stacks/network-stack";
import { IamStack } from "../../lib/stacks/iam-stack";
import { SecurityStack } from "../../lib/stacks/security-stack";
import { S3Stack } from "../../lib/stacks/s3-stack";
import { SqsStack } from "../../lib/stacks/sqs-stack";
import { SsmStack } from "../../lib/stacks/ssm-stack";
import { CloudfrontStack } from "../../lib/stacks/cloudfront-stack";
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

/* ---------------- IAM ---------------- */
const iamStack = new IamStack(app, "EdtvIamStack", {
  env: stackEnv,
  envName: ENV.name,
});

/* ---------------- SECURITY GROUPS ---------------- */
const securityStack = new SecurityStack(app, "EdtvSecurityStack", {
  env: stackEnv,
  vpc: networkStack.vpc,
  envName: ENV.name,
});

/* ---------------- S3 BUCKETS ---------------- */
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
const ssmStack = new SsmStack(app, "EdtvSsmStack", {
  env: stackEnv,
  envName: ENV.name,
});

/* ---------------- CLOUDFRONT ---------------- */
const cloudfrontStack = new CloudfrontStack(app, "EdtvCloudFrontStack", {
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

new cdk.CfnOutput(securityStack, "RdsSecurityGroupIdOutput", {
  value: securityStack.rdsSG.securityGroupId,
});

new cdk.CfnOutput(s3Stack, "MediaBucketNameOutput", {
  value: s3Stack.sourceBucket.bucketName,
});

new cdk.CfnOutput(s3Stack, "ProcessedBucketNameOutput", {
  value: s3Stack.targetBucket.bucketName,
});
