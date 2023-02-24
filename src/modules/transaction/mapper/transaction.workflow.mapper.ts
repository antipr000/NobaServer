import { Injectable } from "@nestjs/common";
import { NotFoundError } from "../../../core/exception/CommonAppException";
import { getTotalFees, Transaction } from "../domain/Transaction";
import { TransactionEvent } from "../domain/TransactionEvent";
import { WorkflowTransactionDTO } from "../dto/transaction.workflow.controller.dto";
import { toTransactionEventDTO, toTransactionFeesDTO } from "./transaction.mapper.util";

@Injectable()
export class TransactionWorkflowMapper {
  toWorkflowTransactionDTO(transaction: Transaction, transactionEvents: TransactionEvent[]): WorkflowTransactionDTO {
    if (!transaction) {
      throw new NotFoundError({ message: "Transaction not found" });
    }

    return {
      id: transaction.id,
      transactionRef: transaction.transactionRef,
      workflowName: transaction.workflowName,
      debitConsumerID: transaction.debitConsumerID,
      creditConsumerID: transaction.creditConsumerID,
      debitCurrency: transaction.debitCurrency,
      creditCurrency: transaction.creditCurrency,
      debitAmount: transaction.debitAmount,
      creditAmount: transaction.creditAmount,
      exchangeRate: transaction.exchangeRate.toString(),
      status: transaction.status,
      memo: transaction.memo,
      transactionEvents: transactionEvents?.map(event => toTransactionEventDTO(event)),
      totalFees: getTotalFees(transaction),
      transactionFees: transaction.transactionFees?.map(fee => toTransactionFeesDTO(fee)),
    };
  }
}
