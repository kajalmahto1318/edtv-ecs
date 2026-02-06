import * as cdk from "aws-cdk-lib";
import { Construct } from "constructs";
import * as s3 from "aws-cdk-lib/aws-s3";
import { applyEdtvTags } from "../shared/tags";

export interface S3StackProps extends cdk.StackProps {
  envName: string;
}

export class S3Stack extends cdk.Stack {
  public readonly tempBucket: s3.Bucket;
  public readonly sourceBucket: s3.Bucket;
  public readonly targetBucket: s3.Bucket;

  constructor(scope: Construct, id: string, props: S3StackProps) {
    super(scope, id, props);

    const { envName } = props;

    this.tempBucket = new s3.Bucket(this, "TempBucket", {
      bucketName: `edtv-cf-${envName}-video-uploads-temp`,
      blockPublicAccess: s3.BlockPublicAccess.BLOCK_ALL,
      removalPolicy: cdk.RemovalPolicy.RETAIN,
    });

    this.sourceBucket = new s3.Bucket(this, "SourceBucket", {
      bucketName: `edtv-cf-${envName}-video-source-originals`,
      blockPublicAccess: s3.BlockPublicAccess.BLOCK_ALL,
      removalPolicy: cdk.RemovalPolicy.RETAIN,
    });

    this.targetBucket = new s3.Bucket(this, "TargetBucket", {
      bucketName: `edtv-cf-${envName}-video-outputs-processed`,
      blockPublicAccess: s3.BlockPublicAccess.BLOCK_ALL,
      removalPolicy: cdk.RemovalPolicy.RETAIN,
    });

    applyEdtvTags(this.tempBucket, "Edtv-Temp-Bucket", envName);
    applyEdtvTags(this.sourceBucket, "Edtv-Source-Bucket", envName);
    applyEdtvTags(this.targetBucket, "Edtv-Target-Bucket", envName);
  }
}
