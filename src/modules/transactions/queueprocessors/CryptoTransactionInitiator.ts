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
  ExecuteQuoteRequest,
  FundsAvailabilityResponse,
  ConsumerAccountTransferRequest,
  FundsAvailabilityStatus,
  PollStatus,
  ExecutedQuote,
  FundsAvailabilityRequest,
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

    // Did we already execute the trade?
    if (!transaction.props.cryptoTradeID) {
      this.logger.info(`Executing trade to Noba`);

      const executeQuoteRequest: ExecuteQuoteRequest = {
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

      try {
        const executedQuote: ExecutedQuote = await assetService.executeQuoteForFundsAvailability(executeQuoteRequest);

        transaction.props.executedCrypto = executedQuote.cryptoReceived;
        transaction.props.cryptoTradeID = executedQuote.tradeID;
        transaction.props.exchangeRate = executedQuote.tradePrice;

        transaction = await this.transactionRepo.updateTransaction(transaction);
      } catch (e) {
        this.logger.error(`Exception while attempting to execute quote: ${e.message}. Will retry.`);
        return;
      }
    }

    // Did we already complete the transfer?
    if (!transaction.props.nobaTransferTradeID) {
      this.logger.debug("Transferring funds to Noba");
      const fundsAvailabilityRequest: FundsAvailabilityRequest = {
        cryptoAmount: transaction.props.executedCrypto,
        cryptocurrency: transaction.props.leg2,
      };
      const fundAvailableResponse: FundsAvailabilityResponse = await assetService.makeFundsAvailable(
        fundsAvailabilityRequest,
      );
      this.logger.info(`Transfer to Noba initiated with ID: "${fundAvailableResponse.transferID}".`);

      let inconsistentTransfer: boolean = false;
      // Ensure here that we transferred the correct amount of the correct crypto
      if (
        fundAvailableResponse.transferredCrypto != fundsAvailabilityRequest.cryptoAmount ||
        fundAvailableResponse.cryptocurrency != fundsAvailabilityRequest.cryptocurrency
      ) {
        // If this happens, still save the transfer ID to the transaction but then abort processing with a failure.
        inconsistentTransfer = true;
        this.logger.error(
          `Transaction ID: ${transactionId} - Crypto traded to noba != crypto transfer! Traded: ${fundsAvailabilityRequest.cryptoAmount} ${fundsAvailabilityRequest.cryptocurrency}, transferred: ${fundAvailableResponse.transferredCrypto} ${fundAvailableResponse.cryptocurrency}. Trade ID: ${transaction.props.cryptoTradeID}, TransferID: ${fundAvailableResponse.transferID}`,
        );
      }

      transaction.props.nobaTransferTradeID = fundAvailableResponse.transferID;
      transaction = await this.transactionRepo.updateTransaction(transaction);

      if (inconsistentTransfer) {
        return this.processFailure(TransactionStatus.FAILED, "Inconsistent transfer of crypto", transaction);
      }
    }

    // TODO(#): Move this to new processor.
    // Have we already settled?
    if (!transaction.props.nobaTransferSettlementID) {
      this.logger.info(`Checking for the settlement of Noba Transfer.`);

      const fundsAvailabilityStatus: FundsAvailabilityStatus = await assetService.pollFundsAvailableStatus(
        transaction.props.nobaTransferTradeID,
      );

      // TODO: Check if the ZH amount coming back from status == executedCrypto on transaction
      // TODO: Assert also that leg2 == executedCrypto for crypto fixed txn

      this.logger.info(`Noba Transfer settlement response: ${JSON.stringify(fundsAvailabilityStatus)}`);

      switch (fundsAvailabilityStatus.status) {
        case PollStatus.SUCCESS:
          transaction.props.nobaTransferSettlementID = fundsAvailabilityStatus.settledId;
          transaction = await this.transactionRepo.updateTransaction(transaction);
          break;

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

    this.logger.info(`Starting the trade to transfer to consumer ZH account.`);

    const assetTransferToConsumerAccountRequest: ConsumerAccountTransferRequest = {
      consumer: consumer.props,
      cryptoAssetTradePrice: transaction.props.exchangeRate,
      totalCryptoAmount: transaction.props.executedCrypto,
      fiatAmountPreSpread: transaction.props.amountPreSpread,
      totalFiatAmount: transaction.props.leg1Amount,
      cryptoCurrency: transaction.props.leg2,
      fiatCurrency: transaction.props.leg1,
      transactionID: transaction.props._id,
      transactionCreationTimestamp: transaction.props.transactionTimestamp,
    };
    const tradeId: string = await assetService.transferAssetToConsumerAccount(assetTransferToConsumerAccountRequest);
    this.logger.info(`Trade initiated to transfer to consumer ZH account with tradeID: "${tradeId}"`);

    transaction.props.cryptoTransactionId = tradeId;
    transaction = await this.transactionRepo.updateTransactionStatus(
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
