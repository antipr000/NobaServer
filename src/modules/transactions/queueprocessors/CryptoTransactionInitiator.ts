import { Inject } from "@nestjs/common";
import { WINSTON_MODULE_PROVIDER } from "nest-winston";
import { ConsumerService } from "../../consumer/consumer.service";
import { Logger } from "winston";
import { TransactionQueueName, TransactionStatus } from "../domain/Types";
import { ITransactionRepo } from "../repo/TransactionRepo";
import { TransactionService } from "../transaction.service";
import { SqsClient } from "./sqs.client";
import { MessageProcessor } from "./message.processor";
import { LockService } from "../../../modules/common/lock.service";
import { AssetServiceFactory } from "../assets/asset.service.factory";
import { AssetService } from "../assets/asset.service";
import {
  FundsAvailabilityRequest,
  FundsAvailabilityResponse,
  ConsumerAccountTransferRequest,
  FundsAvailabilityStatus,
  PollStatus,
} from "../domain/AssetTypes";

export class CryptoTransactionInitiator extends MessageProcessor {
  constructor(
    @Inject(WINSTON_MODULE_PROVIDER) logger: Logger,
    @Inject("TransactionRepo") transactionRepo: ITransactionRepo,
    sqsClient: SqsClient,
    consumerService: ConsumerService,
    transactionService: TransactionService,
    lockService: LockService,
    private readonly assetServiceFactory: AssetServiceFactory,
  ) {
    super(
      logger,
      transactionRepo,
      sqsClient,
      consumerService,
      transactionService,
      TransactionQueueName.FiatTransactionCompleted,
      lockService,
    );
  }

  async processMessageInternal(transactionId: string) {
    let transaction = await this.transactionRepo.getTransaction(transactionId);
    const status = transaction.props.transactionStatus;

    if (status != TransactionStatus.FIAT_INCOMING_COMPLETED && status != TransactionStatus.CRYPTO_OUTGOING_INITIATING) {
      this.logger.info(
        `Transaction ${transactionId} is not in ${TransactionStatus.FIAT_INCOMING_COMPLETED} status, skipping, current status: ${status}`,
      );
      return;
    }

    const consumer = await this.consumerService.getConsumer(transaction.props.userId);
    const assetService: AssetService = this.assetServiceFactory.getAssetService(transaction.props.leg2);

    if (!transaction.props.nobaTransferTradeID) {
      this.logger.info(`Transferring funds to Noba.`);

      const makeFundsAvailableRequest: FundsAvailabilityRequest = {
        consumer: consumer.props,
        cryptoCurrency: transaction.props.leg2,
        fiatCurrency: transaction.props.leg1,

        cryptoQuantity: transaction.props.leg2Amount,
        fiatAmount: transaction.props.leg1Amount,

        // TODO(#): Populate slippage correctly using 'AssetService'
        slippage: 0,

        transactionCreationTimestamp: transaction.props.transactionTimestamp,
        transactionID: transaction.props._id,
      };
      const fundAvailableResponse: FundsAvailabilityResponse = await assetService.makeFundsAvailable(
        makeFundsAvailableRequest,
      );

      this.logger.info(`Transfer to Noba initiated with ID: "${fundAvailableResponse.id}".`);
      // TODO(#): Rename the field to something generic.
      transaction.props.nobaTransferTradeID = fundAvailableResponse.id;
      transaction.props.exchangeRate = fundAvailableResponse.tradePrice;
      await this.transactionRepo.updateTransaction(transaction);
    }

    // TODO(#): Move this to new processor.
    if (!transaction.props.nobaTransferSettlementID) {
      const fundsAvailabilityStatus: FundsAvailabilityStatus = await assetService.pollFundsAvailableStatus(
        transaction.props.nobaTransferTradeID,
      );

      switch (fundsAvailabilityStatus.status) {
        case PollStatus.SUCCESS:
          transaction.props.nobaTransferSettlementID = fundsAvailabilityStatus.settledId;
          await this.transactionRepo.updateTransaction(transaction);

        case PollStatus.PENDING:
          return;

        case PollStatus.FAILURE:
          return this.processFailure(TransactionStatus.FAILED, fundsAvailabilityStatus.errorMessage, transaction);

        case PollStatus.FATAL_ERROR:
          // TODO(#): Add an alarm here.
          this.logger.error(`Unexpected error occured: "${fundsAvailabilityStatus.errorMessage}"`);
          return this.processFailure(TransactionStatus.FAILED, fundsAvailabilityStatus.errorMessage, transaction);
      }
    }

    const assetTransferToConsumerAccountRequest: ConsumerAccountTransferRequest = {
      consumer: consumer.props,
      cryptoAssetTradePrice: transaction.props.exchangeRate,
      totalCryptoAmount: transaction.props.leg2Amount,

      cryptoCurrency: transaction.props.leg2,
      fiatCurrency: transaction.props.leg1,
      transactionID: transaction.props._id,
      transactionCreationTimestamp: transaction.props.transactionTimestamp,
    };
    const tradeId: string = await assetService.transferAssetToConsumerAccount(assetTransferToConsumerAccountRequest);

    transaction.props.cryptoTransactionId = tradeId;
    await this.transactionRepo.updateTransactionStatus(
      transaction.props._id,
      TransactionStatus.CRYPTO_OUTGOING_INITIATED,
      transaction.props,
    );

    //Move to initiated crypto queue, poller will take delay as it's scheduled so we move it to the target queue directly from here
    if (transaction.props.transactionStatus === TransactionStatus.CRYPTO_OUTGOING_INITIATED) {
      await this.sqsClient.enqueue(TransactionQueueName.CryptoTransactionInitiated, transactionId);
    }
  }
}
