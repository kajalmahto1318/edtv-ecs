import * as cdk from "aws-cdk-lib";
import { Construct } from "constructs";
import * as rds from "aws-cdk-lib/aws-rds";
import * as ec2 from "aws-cdk-lib/aws-ec2";
import * as secretsmanager from "aws-cdk-lib/aws-secretsmanager";
import * as iam from "aws-cdk-lib/aws-iam";

export interface DatabaseStackProps extends cdk.StackProps {
  vpc: ec2.IVpc;
  envName: string;
  ecsSecurityGroup: ec2.ISecurityGroup; // ECS workers / services SG
}

export class DatabaseStack extends cdk.Stack {
  public readonly dbInstance: rds.DatabaseInstance;
  public readonly dbSecret: secretsmanager.Secret;
  public readonly rdsSecurityGroup: ec2.SecurityGroup;

  constructor(scope: Construct, id: string, props: DatabaseStackProps) {
    super(scope, id, props);

    const { vpc, envName, ecsSecurityGroup } = props;

    /* ----------------------------------------------------
     * RDS SECURITY GROUP
     * ---------------------------------------------------- */
    this.rdsSecurityGroup = new ec2.SecurityGroup(this, "EdtvRdsSG", {
      vpc,
      description: `RDS Security Group - ${envName}`,
      allowAllOutbound: true,
    });

    // Allow ECS services/workers to access Postgres
    this.rdsSecurityGroup.addIngressRule(
      ecsSecurityGroup,
      ec2.Port.tcp(5432),
      "Allow ECS to access Postgres",
    );

    /* ----------------------------------------------------
     * DATABASE SECRET
     * ---------------------------------------------------- */
    this.dbSecret = new secretsmanager.Secret(this, "PostgresSecret", {
      secretName: `edtv-postgres-${envName}-credentials`,
      generateSecretString: {
        secretStringTemplate: JSON.stringify({
          username: "edtv_admin",
          dbname: "edtv",
        }),
        generateStringKey: "password",
        passwordLength: 16,
        excludePunctuation: true,
      },
    });

    /* ----------------------------------------------------
     * POSTGRES DATABASE
     * ---------------------------------------------------- */
    this.dbInstance = new rds.DatabaseInstance(this, "EdtvPostgres", {
      engine: rds.DatabaseInstanceEngine.postgres({
        version: rds.PostgresEngineVersion.VER_15,
      }),

      vpc,
      vpcSubnets: {
        subnetType: ec2.SubnetType.PRIVATE_WITH_EGRESS,
      },

      instanceType: ec2.InstanceType.of(
        ec2.InstanceClass.T4G,
        ec2.InstanceSize.MICRO,
      ),

      credentials: rds.Credentials.fromSecret(this.dbSecret),

      databaseName: "edtv",

      allocatedStorage: 20,
      maxAllocatedStorage: 100,
      storageType: rds.StorageType.GP3,
      storageEncrypted: true,

      multiAz: false,
      publiclyAccessible: false,

      securityGroups: [this.rdsSecurityGroup],

      backupRetention: cdk.Duration.days(7),
      deletionProtection: envName === "prod",

      removalPolicy:
        envName === "prod"
          ? cdk.RemovalPolicy.RETAIN
          : cdk.RemovalPolicy.DESTROY,
    });

    /* ----------------------------------------------------
     * OUTPUTS
     * ---------------------------------------------------- */
    new cdk.CfnOutput(this, "RdsEndpoint", {
      value: this.dbInstance.dbInstanceEndpointAddress,
      exportName: `edtv-${envName}-rds-endpoint`,
    });

    new cdk.CfnOutput(this, "RdsPort", {
      value: this.dbInstance.dbInstanceEndpointPort,
    });

    new cdk.CfnOutput(this, "RdsSecretArn", {
      value: this.dbSecret.secretArn,
      exportName: `edtv-${envName}-rds-secret-arn`,
    });
  }
}
