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
  ExecutedQuoteStatus,
  TRADE_TYPE_FIXED,
  CombinedNobaQuote,
} from "../domain/AssetTypes";
import { CurrencyService } from "../../../modules/common/currency.service";
import { PartnerService } from "../../../modules/partner/partner.service";

export class CryptoTransactionInitiator extends MessageProcessor {
  constructor(
    @Inject(WINSTON_MODULE_PROVIDER) logger: Logger,
    @Inject("TransactionRepo") transactionRepo: ITransactionRepo,
    sqsClient: SqsClient,
    consumerService: ConsumerService,
    transactionService: TransactionService,
    lockService: LockService,
    private readonly assetServiceFactory: AssetServiceFactory,
    private readonly partnerService: PartnerService,
    private readonly currencyService: CurrencyService,
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
        `${transactionId}: Transaction is not in ${TransactionStatus.FIAT_INCOMING_COMPLETED} status, skipping, current status: ${status}`,
      );
      return;
    }

    const consumer = await this.consumerService.getConsumer(transaction.props.userId);
    const partner = await this.partnerService.getPartner(transaction.props.partnerID);
    const assetService: AssetService = await this.assetServiceFactory.getAssetService(transaction.props.leg2);

    // Did we already execute the trade?
    if (!transaction.props.executedQuoteTradeID) {
      this.logger.info(`${transactionId}: Executing trade to Noba`);

      const executeQuoteRequest: ExecuteQuoteRequest = {
        consumer: consumer.props,
        cryptoCurrency: transaction.props.intermediaryLeg ? transaction.props.intermediaryLeg : transaction.props.leg2,
        fiatCurrency: transaction.props.leg1,

        cryptoQuantity: transaction.props.intermediaryLeg
          ? transaction.props.intermediaryLegAmount
          : transaction.props.leg2Amount,
        fiatAmount: transaction.props.leg1Amount,

        // TODO(#): Populate slippage correctly using 'AssetService'
        slippage: 0,
        fixedSide: transaction.props.fixedSide,

        transactionCreationTimestamp: transaction.props.transactionTimestamp,
        transactionID: transaction.props._id,

        discount: {
          fixedCreditCardFeeDiscountPercent: partner.props.config.fees.creditCardFeeDiscountPercent,
          networkFeeDiscountPercent: partner.props.config.fees.networkFeeDiscountPercent,
          nobaFeeDiscountPercent: partner.props.config.fees.nobaFeeDiscountPercent,
          nobaSpreadDiscountPercent: partner.props.config.fees.spreadDiscountPercent,
          processingFeeDiscountPercent: partner.props.config.fees.processingFeeDiscountPercent,
        },
      };

      try {
        const executedQuote: ExecutedQuote = await assetService.executeQuoteForFundsAvailability(executeQuoteRequest);
        const nobaQuote: CombinedNobaQuote = executedQuote.quote;

        transaction.props.executedCrypto = executedQuote.cryptoReceived;
        if (transaction.props.intermediaryLeg) transaction.props.intermediaryLegAmount = executedQuote.cryptoReceived;
        transaction.props.executedQuoteTradeID = executedQuote.tradeID;
        transaction.props.buyRate = executedQuote.tradePrice;

        transaction.props.tradeQuoteID = nobaQuote.quote.quoteID;
        transaction.props.nobaFee = nobaQuote.quote.nobaFeeInFiat;
        transaction.props.networkFee = nobaQuote.quote.networkFeeInFiat;
        transaction.props.processingFee = nobaQuote.quote.processingFeeInFiat;
        transaction.props.exchangeRate = nobaQuote.quote.perUnitCryptoPriceWithSpread;
        transaction.props.amountPreSpread = nobaQuote.quote.amountPreSpread;

        transaction.props.discounts = {
          fixedCreditCardFeeDiscount: nobaQuote.discountsGiven.creditCardFeeDiscount,
          dynamicCreditCardFeeDiscount: nobaQuote.discountsGiven.processingFeeDiscount,
          networkFeeDiscount: nobaQuote.discountsGiven.networkFeeDiscount,
          nobaFeeDiscount: nobaQuote.discountsGiven.nobaFeeDiscount,
          spreadDiscount: nobaQuote.discountsGiven.spreadDiscount,
        };

        transaction = await this.transactionRepo.updateTransaction(transaction);
      } catch (e) {
        this.logger.error(`${transactionId}: Exception while attempting to execute quote: ${e.message}. Will retry.`);
        return;
      }
    }

    if (transaction.props.executedQuoteTradeID !== TRADE_TYPE_FIXED) {
      if (!transaction.props.executedQuoteSettledTimestamp) {
        const executedQuoteTradeStatus: ExecutedQuoteStatus =
          await assetService.pollExecuteQuoteForFundsAvailabilityStatus(transaction.props.executedQuoteTradeID);

        switch (executedQuoteTradeStatus.status) {
          case PollStatus.SUCCESS:
            transaction.props.executedQuoteSettledTimestamp = executedQuoteTradeStatus.settledTimestamp;
            transaction = await this.transactionRepo.updateTransaction(transaction);
            break;

          case PollStatus.PENDING:
            this.logger.debug(
              `${transactionId}: Waiting for quote trade with ID '${transaction.props.executedQuoteTradeID}' to settle.`,
            );
            return;

          case PollStatus.FAILURE:
            // TODO(#): Limit the # of retries.
            this.logger.error(
              `${transactionId}: Quote trade failed with ID '${transaction.props.executedQuoteTradeID}'. Re-executing the quote.`,
            );

            // Retry the quote execution from the beginning.
            transaction.props.executedQuoteTradeID = undefined;
            transaction = await this.transactionRepo.updateTransaction(transaction);
            return;

          case PollStatus.FATAL_ERROR:
            // TODO(#): Add an alarm here.
            this.logger.error(`${transactionId}: Unexpected error occured: "${executedQuoteTradeStatus.errorMessage}"`);
            return this.processFailure(TransactionStatus.FAILED, executedQuoteTradeStatus.errorMessage, transaction);
        }
      }

      // Did we already complete the transfer?
      if (!transaction.props.nobaTransferTradeID) {
        this.logger.debug(`${transactionId}: Transferring funds to Noba`);
        const fundsAvailabilityRequest: FundsAvailabilityRequest = {
          cryptoAmount: transaction.props.executedCrypto,
          cryptocurrency: transaction.props.intermediaryLeg
            ? transaction.props.intermediaryLeg
            : transaction.props.leg2,
          transactionID: transaction.props._id,
        };
        const fundAvailableResponse: FundsAvailabilityResponse = await assetService.makeFundsAvailable(
          fundsAvailabilityRequest,
        );
        this.logger.info(
          `${transactionId}: Transfer to Noba initiated with ID: "${fundAvailableResponse.transferID}".`,
        );

        let inconsistentTransfer = false;
        // Ensure here that we transferred the correct amount of the correct crypto
        if (
          fundAvailableResponse.transferredCrypto != fundsAvailabilityRequest.cryptoAmount ||
          fundAvailableResponse.cryptocurrency != fundsAvailabilityRequest.cryptocurrency
        ) {
          // If this happens, still save the transfer ID to the transaction but then abort processing with a failure.
          inconsistentTransfer = true;
          this.logger.error(
            `${transactionId}: Crypto traded to noba != crypto transfer! Traded: ${fundsAvailabilityRequest.cryptoAmount} ${fundsAvailabilityRequest.cryptocurrency}, transferred: ${fundAvailableResponse.transferredCrypto} ${fundAvailableResponse.cryptocurrency}. Trade ID: ${transaction.props.executedQuoteTradeID}, TransferID: ${fundAvailableResponse.transferID}`,
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
        this.logger.info(`${transactionId}: Checking for the settlement of Noba Transfer.`);

        const fundsAvailabilityStatus: FundsAvailabilityStatus = await assetService.pollFundsAvailableStatus(
          transaction.props.nobaTransferTradeID,
        );

        // TODO: Check if the ZH amount coming back from status == executedCrypto on transaction
        // TODO: Assert also that leg2 == executedCrypto for crypto fixed txn

        this.logger.info(
          `${transactionId}: Noba Transfer settlement response: ${JSON.stringify(fundsAvailabilityStatus)}`,
        );

        switch (fundsAvailabilityStatus.status) {
          case PollStatus.SUCCESS:
            transaction.props.nobaTransferSettlementID = fundsAvailabilityStatus.settledId;
            transaction = await this.transactionRepo.updateTransaction(transaction);
            break;

          case PollStatus.PENDING:
            this.logger.debug(`${transactionId}: Waiting for transaction ${transaction.props._id} to settle.`);
            return;

          case PollStatus.FAILURE:
            return this.processFailure(TransactionStatus.FAILED, fundsAvailabilityStatus.errorMessage, transaction);

          case PollStatus.FATAL_ERROR:
            // TODO(#): Add an alarm here.
            this.logger.error(`${transactionId}: Unexpected error occured: "${fundsAvailabilityStatus.errorMessage}"`);
            return this.processFailure(TransactionStatus.FAILED, fundsAvailabilityStatus.errorMessage, transaction);
        }
      }
    }

    this.logger.info(`${transactionId}: Starting the trade to transfer to consumer ZH account.`);

    const assetTransferToConsumerAccountRequest: ConsumerAccountTransferRequest = {
      consumer: consumer.props,
      cryptoAssetTradePrice: transaction.props.exchangeRate,
      totalCryptoAmount: transaction.props.executedCrypto,
      fiatAmountPreSpread: transaction.props.amountPreSpread,
      totalFiatAmount: transaction.props.leg1Amount,
      cryptoCurrency: transaction.props.intermediaryLeg ? transaction.props.intermediaryLeg : transaction.props.leg2,
      fiatCurrency: transaction.props.leg1,
      transactionID: transaction.props._id,
      transactionCreationTimestamp: transaction.props.transactionTimestamp,
    };
    const tradeId: string = await assetService.transferAssetToConsumerAccount(assetTransferToConsumerAccountRequest);
    this.logger.info(`${transactionId}: Trade initiated to transfer to consumer ZH account with tradeID: "${tradeId}"`);

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
