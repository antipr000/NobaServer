import { Injectable } from "@nestjs/common";
import { NotFoundError } from "../../../core/exception/CommonAppException";
import { Transaction } from "../domain/Transaction";
import { WorkflowTransactionDTO } from "../dto/transaction.workflow.controller.dto";

@Injectable()
export class TransactionWorkflowMapper {
  toWorkflowTransactionDTO(transaction: Transaction): WorkflowTransactionDTO {
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
      createdTimestamp: transaction.createdTimestamp,
      updatedTimestamp: transaction.updatedTimestamp,
      memo: transaction.memo,
    };
  }
}
