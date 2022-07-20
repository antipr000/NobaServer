import { SQS } from "aws-sdk";
import { AppEnvironment, AWS_ACCOUNT_ID_ATTR, getEnvironmentName } from "../../../config/ConfigurationUtils";
import { TransactionQueueName } from "../../../modules/transactions/queueprocessors/QueuesMeta";

export function initializeSQS() {
  console.log("Initializing SQS queues *****************");

  const queuePrefix = getQueueEnvironmentPrefix();

  const queuesToBeCreated: { queueName: string; queueUrl: string }[] = Object.values(TransactionQueueName).map(x => {
    return { queueName: environmentDependentQueueName(x), queueUrl: environmentDependentQueueUrl(x) };
  });

  const sqs = new SQS();
  sqs.listQueues({ QueueNamePrefix: queuePrefix }, (err, data) => {
    if (err) {
      throw err;
    } else {
      console.log("Existing SQS queues", data);

      queuesToBeCreated.forEach(q => {
        if (!data.QueueUrls || data.QueueUrls.indexOf(q.queueUrl) === -1) {
          console.log("Creating queue", q.queueName);
          console.log(q.queueUrl);
          sqs.createQueue({ QueueName: q.queueName, tags: { environment: queuePrefix } }, (err, data) => {
            if (err) {
              throw err;
            } else {
              console.log("Created queue", q.queueName);
            }
          });
        }
      });
    }
  });
}

export function getQueueEnvironmentPrefix(): string {
  const environmentName: AppEnvironment = getEnvironmentName();

  if (!environmentName) {
    throw new Error("Application environment name not setup");
  }

  const queueEnvironmentPrefix = environmentName == AppEnvironment.DEV ? "dev" : environmentName;

  return queueEnvironmentPrefix;
}

export function environmentDependentQueueName(queueName: string): string {
  const queueEnvironmentPrefix = getQueueEnvironmentPrefix();
  return `${queueEnvironmentPrefix}-${queueName}`;
}

export function environmentDependentQueueUrl(queueName: string): string {
  return `https://sqs.${process.env["AWS_DEFAULT_REGION"]}.amazonaws.com/${
    process.env[AWS_ACCOUNT_ID_ATTR]
  }/${environmentDependentQueueName(queueName)}`;
}
