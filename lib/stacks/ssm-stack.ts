import * as cdk from "aws-cdk-lib";
import { Construct } from "constructs";
import * as ssm from "aws-cdk-lib/aws-ssm";

interface SsmStackProps extends cdk.StackProps {
  envName: string;
}

export class SsmStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props: SsmStackProps) {
    super(scope, id, props);

    const env = props.envName;

    const param = (name: string, value = "CHANGE_ME") =>
      new ssm.StringParameter(this, name, {
        parameterName: name,
        stringValue: value,
      });

    /* MediaConvert */
    param(`/edtv/${env}/mediaconvert/QUEUE_URL`);
    param(`/edtv/${env}/mediaconvert/TARGET_BUCKET`);
    param(`/edtv/${env}/mediaconvert/JOB_TEMPLATE`);

    /* Database */
    param(`/edtv/${env}/db/CONNECTION_STRING`);
  }
}
