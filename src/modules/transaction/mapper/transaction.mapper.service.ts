import { Inject, Injectable } from "@nestjs/common";
import { Transaction } from "../domain/Transaction";
import { ConsumerInformationDTO, TransactionDTO } from "../dto/TransactionDTO";
import { TransactionEventDTO } from "../dto/TransactionEventDTO";
import { ConsumerService } from "../../../modules/consumer/consumer.service";
import { Consumer } from "../../../modules/consumer/domain/Consumer";
import { TransactionEvent } from "../domain/TransactionEvent";
import { MonoTransaction } from "../../../modules/psp/domain/Mono";
import { MonoService } from "../../../modules/psp/mono/mono.service";

@Injectable()
export class TransactionMappingService {
  @Inject()
  private readonly consumerService: ConsumerService;

  @Inject()
  private readonly monoService: MonoService;

  async toTransactionDTO(
    transaction: Transaction,
    consumer: Consumer,
    transactionEvents?: TransactionEvent[],
  ): Promise<TransactionDTO> {
    let debitConsumer: Consumer = null;
    let creditConsumer: Consumer = null;

    if (transaction.debitConsumerID) {
      debitConsumer =
        transaction.debitConsumerID === consumer.props.id
          ? consumer
          : await this.consumerService.getConsumer(transaction.debitConsumerID);
    }

    if (transaction.creditConsumerID) {
      creditConsumer =
        transaction.creditConsumerID === consumer.props.id
          ? consumer
          : await this.consumerService.getConsumer(transaction.creditConsumerID);
    }

    const monoTransaction: MonoTransaction = await this.monoService.getTransactionByNobaTransactionID(transaction.id);

    return {
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
      transactionEvents: transactionEvents?.map(event => this.toTransactionEventDTO(event)),
      ...(monoTransaction &&
        monoTransaction.collectionLinkDepositDetails && {
          paymentCollectionLink: monoTransaction.collectionLinkDepositDetails.collectionURL,
        }),
    };
  }

  toTransactionEventDTO(transactionEvent: TransactionEvent): TransactionEventDTO {
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
