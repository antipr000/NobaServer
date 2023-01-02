import { Transaction } from "../domain/Transaction";
import { TransactionDTO } from "../dto/TransactionDTO";

export class TransactionMapper {
  toDTO(transaction: Transaction): TransactionDTO {
    return {
      transactionRef: transaction.transactionRef,
      workflowName: transaction.workflowName,
      debitCurrency: transaction.debitCurrency,
      creditCurrency: transaction.creditCurrency,
      debitAmount: transaction.debitAmount,
      creditAmount: transaction.creditAmount,
      exchangeRate: transaction.exchangeRate.toString(),
      memo: "",
    };
  }
}
