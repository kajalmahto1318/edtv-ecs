export const ENV = {
  name: process.env.ENVIRONMENT_NAME || "production",
  region: process.env.AWS_REGION || "ap-south-1",
  account:
    process.env.CDK_DEFAULT_ACCOUNT ||
    process.env.AWS_ACCOUNT_ID ||
    "995363435590",
};
