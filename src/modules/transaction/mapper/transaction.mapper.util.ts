import { TransactionEvent } from "../domain/TransactionEvent";
import { TransactionFee } from "../domain/TransactionFee";
import { TransactionFeeDTO } from "../dto/TransactionDTO";
import { TransactionEventDTO } from "../dto/TransactionEventDTO";

export const toTransactionFeesDTO = (transactionFees: TransactionFee): TransactionFeeDTO => {
  return {
    amount: transactionFees.amount,
    currency: transactionFees.currency,
    type: transactionFees.type,
  };
};

export const toTransactionEventDTO = (transactionEvent: TransactionEvent): TransactionEventDTO => {
  return {
    timestamp: transactionEvent.timestamp,
    internal: transactionEvent.internal,
    message: transactionEvent.message,
    ...(transactionEvent.details !== undefined && { details: transactionEvent.details }),
    ...(transactionEvent.key !== undefined && { key: transactionEvent.key }),
    ...(transactionEvent.param1 !== undefined && {
      parameters: Array.of(
        transactionEvent.param1,
        transactionEvent.param2,
        transactionEvent.param3,
        transactionEvent.param4,
        transactionEvent.param5,
      ),
    }),
  };
};
