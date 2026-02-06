import * as cdk from "aws-cdk-lib";
import { Construct } from "constructs";
import * as ec2 from "aws-cdk-lib/aws-ec2";

interface SecurityStackProps extends cdk.StackProps {
  vpc: ec2.IVpc;
  envName: string;
}

export class SecurityStack extends cdk.Stack {
  public readonly ecsSG: ec2.SecurityGroup;
  public readonly lambdaSG: ec2.SecurityGroup;
  public readonly rdsSG: ec2.SecurityGroup;

  constructor(scope: Construct, id: string, props: SecurityStackProps) {
    super(scope, id, props);

    const { vpc, envName } = props;

    this.ecsSG = new ec2.SecurityGroup(this, "EcsSG", {
      vpc,
      description: "ECS worker security group",
      securityGroupName: `edtv-ecs-sg-${envName}`,
      allowAllOutbound: true,
    });

    this.lambdaSG = new ec2.SecurityGroup(this, "LambdaSG", {
      vpc,
      description: "Lambda inside VPC",
      securityGroupName: `edtv-lambda-sg-${envName}`,
      allowAllOutbound: true,
    });

    this.rdsSG = new ec2.SecurityGroup(this, "RdsSG", {
      vpc,
      description: "RDS access",
      securityGroupName: `edtv-rds-sg-${envName}`,
      allowAllOutbound: true,
    });

    this.rdsSG.addIngressRule(this.ecsSG, ec2.Port.tcp(5432), "ECS to RDS");

    this.rdsSG.addIngressRule(
      this.lambdaSG,
      ec2.Port.tcp(5432),
      "Lambda to RDS",
    );
  }
}
