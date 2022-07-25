import { SQS } from "aws-sdk";
import { TransactionQueueName } from "../../../modules/transactions/queueprocessors/QueuesMeta";
import { environmentDependentQueueName, environmentDependentQueueUrl, getQueueEnvironmentPrefix } from "./CommonUtils";

export function initializeSQS() {
  console.log("Initializing SQS queues *****************");

  const queuePrefix = getQueueEnvironmentPrefix();

  const queuesToBeCreated: { queueName: string; queueUrl: string }[] = Object.values(TransactionQueueName).map(x => {
    return { queueName: environmentDependentQueueName(x), queueUrl: environmentDependentQueueUrl(x) };
  });

  const sqs = new SQS(/*{ endpoint: "http://localhost:4566/000000000000/" }*/);
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
