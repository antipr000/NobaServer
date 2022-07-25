import { AppEnvironment, AWS_ACCOUNT_ID_ATTR, getEnvironmentName } from "../../../config/ConfigurationUtils";

export function environmentDependentQueueUrl(queueName: string): string {
  return `https://sqs.${process.env["AWS_DEFAULT_REGION"]}.amazonaws.com/${process.env[AWS_ACCOUNT_ID_ATTR]
    }/${environmentDependentQueueName(queueName)}`;
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
