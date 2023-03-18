import { Inject, Injectable } from "@nestjs/common";
import { Transaction, WorkflowName, getTotalFees } from "../domain/Transaction";
import { ConsumerInformationDTO, TransactionDTO, TransactionFeeDTO } from "../dto/TransactionDTO";
import { ConsumerService } from "../../../modules/consumer/consumer.service";
import { Consumer } from "../../../modules/consumer/domain/Consumer";
import { TransactionEvent } from "../domain/TransactionEvent";
import { MonoTransaction } from "../../../modules/psp/domain/Mono";
import { MonoService } from "../../../modules/psp/mono/mono.service";
import { ServiceErrorCode, ServiceException } from "../../../core/exception/service.exception";
import { toTransactionEventDTO, toTransactionFeesDTO } from "./transaction.mapper.util";
import { TransactionFee } from "../domain/TransactionFee";
import { TransactionEventDTO } from "../dto/TransactionEventDTO";

@Injectable()
export class TransactionMappingService {
  @Inject()
  private readonly consumerService: ConsumerService;

  @Inject()
  private readonly monoService: MonoService;

  async toTransactionDTO(
    transaction: Transaction,
    consumer?: Consumer,
    transactionEvents?: TransactionEvent[],
  ): Promise<TransactionDTO> {
    let debitConsumer: Consumer = null;
    let creditConsumer: Consumer = null;

    if (transaction.debitConsumerID) {
      debitConsumer =
        transaction.debitConsumerID === consumer?.props.id
          ? consumer
          : await this.consumerService.getConsumer(transaction.debitConsumerID);
    }

    if (transaction.creditConsumerID) {
      creditConsumer =
        transaction.creditConsumerID === consumer?.props.id
          ? consumer
          : await this.consumerService.getConsumer(transaction.creditConsumerID);
    }

    let monoTransaction: MonoTransaction;

    // We only need to fetch the Mono transaction for WALLET_DEPOSIT transactions
    // as they are the only ones that have a collection link
    if (transaction.workflowName == WorkflowName.WALLET_DEPOSIT) {
      try {
        console.log("here123", transaction.id);
        monoTransaction = await this.monoService.getTransactionByNobaTransactionID(transaction.id);
        console.log("here456");
        console.log("monoTransaction", monoTransaction);
      } catch (e) {
        if (e instanceof ServiceException && e.errorCode === ServiceErrorCode.DOES_NOT_EXIST) {
          // no-op - this is expected for some transactions
        }
      }
    }

    return {
      id: transaction.id,
      transactionRef: transaction.transactionRef,
      workflowName: transaction.workflowName,
      debitConsumer: this.toConsumerInformationDTO(debitConsumer),
      creditConsumer: this.toConsumerInformationDTO(creditConsumer),
      debitCurrency: transaction.debitCurrency,
      creditCurrency: transaction.creditCurrency,
      debitAmount: transaction.debitAmount,
      creditAmount: transaction.creditAmount,
      exchangeRate: transaction.exchangeRate.toString(),
      status: transaction.status,
      createdTimestamp: transaction.createdTimestamp,
      updatedTimestamp: transaction.updatedTimestamp,
      memo: transaction.memo,
      transactionEvents: transactionEvents?.map(event => toTransactionEventDTO(event)),
      totalFees: getTotalFees(transaction),
      transactionFees: transaction.transactionFees?.map(fee => toTransactionFeesDTO(fee)),
      ...(monoTransaction &&
        monoTransaction.collectionLinkDepositDetails && {
          paymentCollectionLink: monoTransaction.collectionLinkDepositDetails.collectionURL,
        }),
    };
  }

  private toConsumerInformationDTO(consumer?: Consumer): ConsumerInformationDTO {
    if (!consumer) return null;
    return {
      id: consumer.props.id,
      handle: consumer.props.handle,
      firstName: consumer.props.firstName,
      lastName: consumer.props.lastName,
    };
  }
}

export const TRANSACTION_MAPPING_SERVICE_PROVIDER = "TRANSACTION_MAPPING_SERVICE";
