import { WorkflowName } from "../domain/Transaction";
import { InputTransactionFee } from "../domain/TransactionFee";

export class ProcessedTransactionDTO {
  workflowName: WorkflowName;
  creditConsumerID?: string;
  debitConsumerID?: string;
  debitCurrency?: string;
  creditCurrency?: string;
  debitAmount?: number;
  creditAmount?: number;
  exchangeRate: number;
  memo?: string;
  transactionFees: InputTransactionFee[];
}
