import * as cdk from "aws-cdk-lib";
import { Construct } from "constructs";
import * as cloudfront from "aws-cdk-lib/aws-cloudfront";
import * as origins from "aws-cdk-lib/aws-cloudfront-origins";
import * as s3 from "aws-cdk-lib/aws-s3";

interface CloudfrontStackProps extends cdk.StackProps {
  envName: string;
  processedBucket: s3.IBucket;
}

export class CloudfrontStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props: CloudfrontStackProps) {
    super(scope, id, props);

    const distribution = new cloudfront.Distribution(this, "EdtvDistribution", {
      defaultBehavior: {
        origin: new origins.S3Origin(props.processedBucket),
        viewerProtocolPolicy: cloudfront.ViewerProtocolPolicy.REDIRECT_TO_HTTPS,
        allowedMethods: cloudfront.AllowedMethods.ALLOW_GET_HEAD,
        cachePolicy: cloudfront.CachePolicy.CACHING_OPTIMIZED,
      },
      comment: `EdTV Media CDN (${props.envName})`,
      enabled: true,
    });

    new cdk.CfnOutput(this, "CloudFrontURL", {
      value: distribution.domainName,
    });
  }
}
