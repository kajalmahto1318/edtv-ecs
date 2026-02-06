import * as cdk from "aws-cdk-lib";
import { Construct } from "constructs";
import * as s3 from "aws-cdk-lib/aws-s3";
import * as iam from "aws-cdk-lib/aws-iam";
import { applyEdtvTags } from "../shared/tags";

export interface S3StackProps extends cdk.StackProps {
  envName: string;
}

export class S3Stack extends cdk.Stack {
  public readonly sourceBucket: s3.Bucket;
  public readonly targetBucket: s3.Bucket;
  public readonly tempBucket: s3.Bucket;

  constructor(scope: Construct, id: string, props: S3StackProps) {
    super(scope, id, props);

    const { envName } = props;

    const corsRule: s3.CorsRule = {
      allowedMethods: [
        s3.HttpMethods.GET,
        s3.HttpMethods.PUT,
        s3.HttpMethods.POST,
        s3.HttpMethods.HEAD,
      ],
      allowedOrigins: ["*"],
      allowedHeaders: ["*"],
      exposedHeaders: ["ETag"],
    };

    this.tempBucket = new s3.Bucket(this, "TempBucket", {
      bucketName: `edtv-cf-${envName}-video-uploads-temp`,
      blockPublicAccess: s3.BlockPublicAccess.BLOCK_ALL,
      cors: [corsRule],
      versioned: false,
      removalPolicy: cdk.RemovalPolicy.DESTROY,
      autoDeleteObjects: true,
    });

    this.sourceBucket = new s3.Bucket(this, "SourceBucket", {
      bucketName: `edtv-cf-${envName}-video-source-originals`,
      blockPublicAccess: s3.BlockPublicAccess.BLOCK_ALL,
      cors: [corsRule],
      versioned: false,
      removalPolicy: cdk.RemovalPolicy.DESTROY,
      autoDeleteObjects: true,
    });

    this.targetBucket = new s3.Bucket(this, "TargetBucket", {
      bucketName: `edtv-cf-${envName}-video-outputs-processed`,
      blockPublicAccess: s3.BlockPublicAccess.BLOCK_ALL,
      cors: [corsRule],
      versioned: false,
      removalPolicy: cdk.RemovalPolicy.DESTROY,
      autoDeleteObjects: true,
    });

    // ✅ OLD + STABLE WAY (NO CYCLE)
    this.targetBucket.addToResourcePolicy(
      new iam.PolicyStatement({
        sid: "AllowCloudFrontRead",
        actions: ["s3:GetObject"],
        resources: [`${this.targetBucket.bucketArn}/*`],
        principals: [new iam.ServicePrincipal("cloudfront.amazonaws.com")],
      }),
    );

    applyEdtvTags(this.tempBucket, "Edtv-Temp-Bucket", envName);
    applyEdtvTags(this.sourceBucket, "Edtv-Source-Bucket", envName);
    applyEdtvTags(this.targetBucket, "Edtv-Target-Bucket", envName);

    new cdk.CfnOutput(this, "TempBucketName", {
      value: this.tempBucket.bucketName,
    });
    new cdk.CfnOutput(this, "SourceBucketName", {
      value: this.sourceBucket.bucketName,
    });
    new cdk.CfnOutput(this, "TargetBucketName", {
      value: this.targetBucket.bucketName,
    });
  }
}
