import { Transaction } from "../domain/Transaction";
import { TransactionDTO } from "../dto/TransactionDTO";
import { TransactionEventDTO } from "../dto/TransactionEventDTO";

export class TransactionMapper {
  static toDTO(
    transaction: Transaction,
    debitConsumerTag?: string,
    creditConsumerTag?: string,
    resolveTags?: boolean,
    transactionEvents?: TransactionEventDTO[],
  ): TransactionDTO {
    return {
      transactionRef: transaction.transactionRef,
      workflowName: transaction.workflowName,
      debitConsumerIDOrTag: transaction.debitConsumerID
        ? resolveTags
          ? debitConsumerTag
          : transaction.debitConsumerID
        : undefined,
      creditConsumerIDOrTag: transaction.creditConsumerID
        ? resolveTags
          ? creditConsumerTag
          : transaction.creditConsumerID
        : undefined,
      debitCurrency: transaction.debitCurrency,
      creditCurrency: transaction.creditCurrency,
      debitAmount: transaction.debitAmount,
      creditAmount: transaction.creditAmount,
      exchangeRate: transaction.exchangeRate.toString(),
      status: transaction.status,
      createdTimestamp: transaction.createdTimestamp,
      updatedTimestamp: transaction.updatedTimestamp,
      memo: transaction.memo,
      transactionEvents: transactionEvents,
    };
  }
}
