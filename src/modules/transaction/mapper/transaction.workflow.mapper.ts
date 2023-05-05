import { Injectable } from "@nestjs/common";
import { NotFoundError } from "../../../core/exception/CommonAppException";
import { getTotalFees, Transaction } from "../domain/Transaction";
import { TransactionEvent } from "../domain/TransactionEvent";
import { WorkflowTransactionDTO } from "../dto/transaction.workflow.controller.dto";
import { toTransactionEventDTO, toTransactionFeesDTO } from "./transaction.mapper.util";

@Injectable()
export class TransactionWorkflowMapper {
  async toWorkflowTransactionDTO(
    transaction: Transaction,
    transactionEvents: TransactionEvent[],
  ): Promise<WorkflowTransactionDTO> {
    if (!transaction) {
      throw new NotFoundError({ message: "Transaction not found" });
    }

    let transactionEventDTOs;
    if (transactionEvents) {
      transactionEventDTOs = await Promise.all(transactionEvents.map(event => toTransactionEventDTO(event, "en")));
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
      transactionEvents: transactionEventDTOs,
      totalFees: getTotalFees(transaction),
      transactionFees: transaction.transactionFees?.map(fee => toTransactionFeesDTO(fee)),
    };
  }
}
