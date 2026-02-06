import * as cdk from "aws-cdk-lib";
import { Construct } from "constructs";
import * as mediaconvert from "aws-cdk-lib/aws-mediaconvert";
import * as iam from "aws-cdk-lib/aws-iam";
import * as s3 from "aws-cdk-lib/aws-s3";

export interface MediaConvertJobTemplateCoreStackProps extends cdk.StackProps {
  envName: string;
  sourceBucket: s3.IBucket;
  targetBucket: s3.IBucket;
  mediaConvertRole: iam.IRole;
}

export class MediaConvertJobTemplateCoreStack extends cdk.Stack {
  public readonly jobTemplateName: string;

  constructor(
    scope: Construct,
    id: string,
    props: MediaConvertJobTemplateCoreStackProps
  ) {
    super(scope, id, props);

    const { envName, sourceBucket, targetBucket, mediaConvertRole } = props;

    // Permissions
    sourceBucket.grantRead(mediaConvertRole);
    targetBucket.grantReadWrite(mediaConvertRole);

    const jobTemplate = new mediaconvert.CfnJobTemplate(
      this,
      "EdtvHlsJobTemplate",
      {
        name: `edtv-hls-template-${envName}`,
        category: "EDTV",
        description: "EDTV HLS MediaConvert Template",
        settingsJson: {
          OutputGroups: [
            {
              Name: "HLS Group",
              OutputGroupSettings: {
                Type: "HLS_GROUP_SETTINGS",
                HlsGroupSettings: {
                  SegmentLength: 6,
                  Destination: `s3://${targetBucket.bucketName}/outputs/`,
                },
              },
            },
          ],
        },
      }
    );

    this.jobTemplateName = jobTemplate.name!;
  }
}
 