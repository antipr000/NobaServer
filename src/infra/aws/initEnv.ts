import { initializeSQS } from "./services/SqsUtils";

// TODO setup Terraform and Terragrunt
export async function initializeAWSEnv() {
  console.log("Initializing AWS environment");
  initializeSQS();
}
