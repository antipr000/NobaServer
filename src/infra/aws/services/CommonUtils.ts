import { SQS } from "aws-sdk";
import { AppEnvironment, AWS_ACCOUNT_ID_ATTR, getEnvironmentName } from "../../../config/ConfigurationUtils";

// TODO(#310) - Get LocalStack working
const LOCAL_SQS_URI = "http://localhost:4566";

export function environmentDependentQueueUrl(queueName: string): string {
  return `https://sqs.${process.env["AWS_DEFAULT_REGION"]}.amazonaws.com/${
    process.env[AWS_ACCOUNT_ID_ATTR]
  }/${environmentDependentQueueName(queueName)}`;
  /*getEnvironmentName() === AppEnvironment.DEV || getEnvironmentName() === AppEnvironment.E2E_TEST
    ? `${LOCAL_SQS_URI}/000000000000/${environmentDependentQueueName(queueName)}`
    :  `https://sqs.${process.env["AWS_DEFAULT_REGION"]}.amazonaws.com/${process.env[AWS_ACCOUNT_ID_ATTR]}/${environmentDependentQueueName(queueName)}`;*/
}

export function environmentDependentQueueName(queueName: string): string {
  const queueEnvironmentPrefix = getQueueEnvironmentPrefix();
  return `${queueEnvironmentPrefix}-${queueName}`;
}

export function getQueueEnvironmentPrefix(): string {
  const environmentName: AppEnvironment = getEnvironmentName();

  if (!environmentName) {
    throw new Error("Application environment name not setup");
  }

  const queueEnvironmentPrefix = environmentName == AppEnvironment.DEV ? "dev" : environmentName;

  return queueEnvironmentPrefix;
}

export function getSQSInstance(): SQS {
  return new SQS();
  /*getEnvironmentName() === AppEnvironment.DEV || getEnvironmentName() === AppEnvironment.E2E_TEST
    ? new SQS({ endpoint: LOCAL_SQS_URI })
    : new SQS(); // Default for AWS envs*/
}
