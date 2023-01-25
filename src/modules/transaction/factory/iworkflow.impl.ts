import { Transaction } from "../domain/Transaction";
import { InitiateTransactionDTO } from "../dto/CreateTransactionDTO";

export interface IWorkflowImpl {
  preprocessTransactionParams(
    transactionDetails: InitiateTransactionDTO,
    initiatingConsumer: string,
  ): Promise<InitiateTransactionDTO>;

  initiateWorkflow(transaction: Transaction): Promise<void>;
}
