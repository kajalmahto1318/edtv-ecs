import * as cdk from "aws-cdk-lib";
import { Construct } from "constructs";
import * as s3 from "aws-cdk-lib/aws-s3";
import * as s3n from "aws-cdk-lib/aws-s3-notifications";
import * as sqs from "aws-cdk-lib/aws-sqs";

export interface MediaConvertSourceUploadBucketStackProps
  extends cdk.StackProps {
  envName: string;
  jobQueue: sqs.IQueue;
}

export class MediaConvertSourceUploadBucketStack extends cdk.Stack {
  public readonly sourceUploadBucket: s3.Bucket;

  constructor(
    scope: Construct,
    id: string,
    props: MediaConvertSourceUploadBucketStackProps
  ) {
    super(scope, id, props);

    const { envName, jobQueue } = props;

    /**
     * SOURCE BUCKET
     * Raw video upload starts MediaConvert pipeline
     */
    this.sourceUploadBucket = new s3.Bucket(this, "SourceUploadBucket", {
      bucketName: `edtv-cf-${envName}-video-uploads-temp`,
      blockPublicAccess: s3.BlockPublicAccess.BLOCK_ALL,
      removalPolicy: cdk.RemovalPolicy.RETAIN,
    });

    
    this.sourceUploadBucket.addEventNotification(
      s3.EventType.OBJECT_CREATED,
      new s3n.SqsDestination(jobQueue)
    );

    new cdk.CfnOutput(this, "SourceUploadBucketName", {
      value: this.sourceUploadBucket.bucketName,
    });
  }
}
