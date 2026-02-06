import * as cdk from "aws-cdk-lib";
import { Construct } from "constructs";
import * as ec2 from "aws-cdk-lib/aws-ec2";

/**
 * NetworkStackProps
 * Used to pass environment-specific values
 */
export interface NetworkStackProps extends cdk.StackProps {
  envName: string; // dev | stage | prod
  cidrRange?: string; // optional override
  maxAzs?: number;
  natGateways?: number;
}

export class NetworkStack extends cdk.Stack {
  public readonly vpc: ec2.Vpc;

  constructor(scope: Construct, id: string, props: NetworkStackProps) {
    super(scope, id, props);

    /**
     * -------------------------
     * ENV SAFE DEFAULTS
     * -------------------------
     */
    const envName = props.envName;
    const cidr = props.cidrRange ?? "10.0.0.0/16";
    const azCount = props.maxAzs ?? 2;
    const natCount = props.natGateways ?? 1;

    /**
     * -------------------------
     * VPC
     * -------------------------
     */
    this.vpc = new ec2.Vpc(this, "Vpc", {
      vpcName: `edtv-vpc-${envName}`,
      ipAddresses: ec2.IpAddresses.cidr(cidr),
      maxAzs: azCount,
      natGateways: natCount,

      subnetConfiguration: [
        {
          name: `public-${envName}`,
          subnetType: ec2.SubnetType.PUBLIC,
          cidrMask: 24,
        },
        {
          name: `private-${envName}`,
          subnetType: ec2.SubnetType.PRIVATE_WITH_EGRESS,
          cidrMask: 24,
        },
      ],
    });

    /**
     * -------------------------
     * OUTPUTS (cross-stack usage)
     * -------------------------
     */
    new cdk.CfnOutput(this, "VpcId", {
      value: this.vpc.vpcId,
      exportName: `edtv-${envName}-vpc-id`,
    });

    new cdk.CfnOutput(this, "PublicSubnets", {
      value: this.vpc
        .selectSubnets({
          subnetType: ec2.SubnetType.PUBLIC,
        })
        .subnetIds.join(","),
      exportName: `edtv-${envName}-public-subnets`,
    });

    new cdk.CfnOutput(this, "PrivateSubnets", {
      value: this.vpc
        .selectSubnets({
          subnetType: ec2.SubnetType.PRIVATE_WITH_EGRESS,
        })
        .subnetIds.join(","),
      exportName: `edtv-${envName}-private-subnets`,
    });
  }
}
