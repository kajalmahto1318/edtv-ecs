import { Tags } from "aws-cdk-lib";
import { Construct } from "constructs";

export function applyEdtvTags(
  resource: Construct,
  name: string,
  environment: string,
) {
  Tags.of(resource).add("Name", name);
  Tags.of(resource).add("environment", environment);
}
