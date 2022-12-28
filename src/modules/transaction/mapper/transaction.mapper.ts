import { Transaction } from "../domain/Transaction";
import { Currency } from "../domain/TransactionTypes";
import { TransactionDTO } from "../dto/TransactionDTO";

export class TransactionMapper {
  toDTO(transaction: Transaction): TransactionDTO {
    return {
      transactionRef: transaction.transactionRef,
      workflowName: transaction.workflowName,
      debitConsumer: "", // Replace with handle
      creditConsumer: "", // Replace with handle
      debitCurrency: Currency.USD,
      creditCurrency: Currency.COP,
      debitAmount: transaction.amount,
      creditAmount: 0,
      exchangeRate: transaction.exchangeRate.toString(),
      memo: "",
    };
  }
}
