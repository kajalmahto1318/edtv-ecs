import * as cdk from "aws-cdk-lib";
import { Construct } from "constructs";
import * as iam from "aws-cdk-lib/aws-iam";
import { applyEdtvTags } from "../shared/tags";

interface IamStackProps extends cdk.StackProps {
  envName: string;
  mediaConvertEndpoint?: string;
}

export class IamStack extends cdk.Stack {
  public readonly ecsTaskRole: iam.Role;
  public readonly ecsExecutionRole: iam.Role;
  public readonly mediaConvertRole: iam.Role;
  public readonly lambdaRole: iam.Role;

  // 🔥 IMPORTANT
  public readonly mediaConvertEndpoint: string;

  constructor(scope: Construct, id: string, props: IamStackProps) {
    super(scope, id, props);

    const { envName, mediaConvertEndpoint } = props;

    /* --------------------------------------------------
     * MEDIACONVERT ENDPOINT (ACCOUNT-SPECIFIC)
     * Use the provided endpoint or AWS default
     * -------------------------------------------------- */
    // Note: MediaConvert endpoints are managed by AWS.
    // You can obtain the endpoint from your AWS account via:
    // - AWS Console: MediaConvert > Account settings
    // - AWS CLI: aws mediaconvert describe-endpoints
    // - Or set via environment variable / SSM Parameter
    this.mediaConvertEndpoint =
      mediaConvertEndpoint || "https://mediaconvert.us-east-1.amazonaws.com";

    /* --------------------------------------------------
     * MEDIACONVERT SERVICE ROLE
     * -------------------------------------------------- */
    this.mediaConvertRole = new iam.Role(this, "MediaConvertRole", {
      roleName: `edtv-${envName}-mediaconvert-role`,
      assumedBy: new iam.ServicePrincipal("mediaconvert.amazonaws.com"),
    });

    this.mediaConvertRole.addToPolicy(
      new iam.PolicyStatement({
        actions: [
          "s3:GetObject",
          "s3:PutObject",
          "s3:ListBucket",
          "logs:CreateLogGroup",
          "logs:CreateLogStream",
          "logs:PutLogEvents",
        ],
        resources: ["*"],
      }),
    );

    /* --------------------------------------------------
     * ECS TASK ROLE
     * -------------------------------------------------- */
    this.ecsTaskRole = new iam.Role(this, "EcsTaskRole", {
      roleName: `edtv-${envName}-ecs-task-role`,
      assumedBy: new iam.ServicePrincipal("ecs-tasks.amazonaws.com"),
    });

    this.ecsTaskRole.addToPolicy(
      new iam.PolicyStatement({
        actions: [
          "sqs:ReceiveMessage",
          "sqs:DeleteMessage",
          "sqs:GetQueueAttributes",
        ],
        resources: ["*"],
      }),
    );

    this.ecsTaskRole.addToPolicy(
      new iam.PolicyStatement({
        actions: [
          "mediaconvert:CreateJob",
          "mediaconvert:GetJob",
          "mediaconvert:DescribeEndpoints",
        ],
        resources: ["*"],
      }),
    );

    this.ecsTaskRole.addToPolicy(
      new iam.PolicyStatement({
        actions: ["iam:PassRole"],
        resources: [this.mediaConvertRole.roleArn],
      }),
    );

    /* --------------------------------------------------
     * ECS EXECUTION ROLE
     * -------------------------------------------------- */
    this.ecsExecutionRole = new iam.Role(this, "EcsExecutionRole", {
      roleName: `edtv-${envName}-ecs-execution-role`,
      assumedBy: new iam.ServicePrincipal("ecs-tasks.amazonaws.com"),
      managedPolicies: [
        iam.ManagedPolicy.fromAwsManagedPolicyName(
          "service-role/AmazonECSTaskExecutionRolePolicy",
        ),
      ],
    });

    /* --------------------------------------------------
     * LAMBDA ROLE
     * -------------------------------------------------- */
    this.lambdaRole = new iam.Role(this, "LambdaExecutionRole", {
      roleName: `edtv-${envName}-lambda-role`,
      assumedBy: new iam.ServicePrincipal("lambda.amazonaws.com"),
      managedPolicies: [
        iam.ManagedPolicy.fromAwsManagedPolicyName(
          "service-role/AWSLambdaBasicExecutionRole",
        ),
      ],
    });

    /* --------------------------------------------------
     * TAGS
     * -------------------------------------------------- */
    applyEdtvTags(this.ecsTaskRole, "Edtv-ECS-Task-Role", envName);
    applyEdtvTags(this.ecsExecutionRole, "Edtv-ECS-Execution-Role", envName);
    applyEdtvTags(this.lambdaRole, "Edtv-Lambda-Role", envName);
    applyEdtvTags(this.mediaConvertRole, "Edtv-MediaConvert-Role", envName);
  }
}
