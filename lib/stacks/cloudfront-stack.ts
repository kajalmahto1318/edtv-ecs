import * as cdk from "aws-cdk-lib";
import { Construct } from "constructs";
import * as cloudfront from "aws-cdk-lib/aws-cloudfront";
import * as origins from "aws-cdk-lib/aws-cloudfront-origins";
import * as s3 from "aws-cdk-lib/aws-s3";

export interface CloudfrontStackProps extends cdk.StackProps {
  envName: string;
  processedBucket: s3.IBucket;
}

export class CloudfrontStack extends cdk.Stack {
  public readonly distribution: cloudfront.Distribution;

  constructor(scope: Construct, id: string, props: CloudfrontStackProps) {
    super(scope, id, props);

    const { processedBucket, envName } = props;

    // Use S3Origin (stable, works with any S3 bucket)
    // Alternative: Use processedBucket.bucketWebsiteUrl for static website hosting
    this.distribution = new cloudfront.Distribution(this, "EdtvDistribution", {
      defaultBehavior: {
        origin: new origins.S3Origin(processedBucket),
        viewerProtocolPolicy: cloudfront.ViewerProtocolPolicy.REDIRECT_TO_HTTPS,
        allowedMethods: cloudfront.AllowedMethods.ALLOW_GET_HEAD,
        cachePolicy: cloudfront.CachePolicy.CACHING_OPTIMIZED,
      },
      priceClass: cloudfront.PriceClass.PRICE_CLASS_200,
      enabled: true,
      comment: `EdTV processed video CDN (${envName})`,
    });

    new cdk.CfnOutput(this, "CloudFrontDomainName", {
      value: this.distribution.domainName,
    });
  }
}
