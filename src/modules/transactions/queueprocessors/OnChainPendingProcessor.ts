import { Inject } from "@nestjs/common";
import { WINSTON_MODULE_PROVIDER } from "nest-winston";
import { Logger } from "winston";
import { TransactionStatus, TransactionQueueName } from "../domain/Types";
import { ITransactionRepo } from "../repo/TransactionRepo";
import { ZeroHashService } from "../zerohash.service";
import { ConsumerService } from "../../consumer/consumer.service";
import { EmailService } from "../../common/email.service";
import { TransactionService } from "../transaction.service";
import { SqsClient } from "./sqs.client";
import { MessageProcessor } from "./message.processor";
import { LockService } from "../../../modules/common/lock.service";
import { AssetServiceFactory } from "../assets/asset.service.factory";
import { AssetService } from "../assets/asset.service";
import { PartnerService } from "../../partner/partner.service";
import { ConsumerWalletTransferRequest, ConsumerWalletTransferStatus, PollStatus } from "../domain/AssetTypes";

export class OnChainPendingProcessor extends MessageProcessor {
  constructor(
    @Inject(WINSTON_MODULE_PROVIDER) logger: Logger,
    @Inject("TransactionRepo") transactionRepo: ITransactionRepo,
    sqsClient: SqsClient,
    consumerService: ConsumerService,
    transactionService: TransactionService,
    lockService: LockService,
    private readonly emailService: EmailService,
    private readonly assetServiceFactory: AssetServiceFactory,
  ) {
    super(
      logger,
      transactionRepo,
      sqsClient,
      consumerService,
      transactionService,
      TransactionQueueName.OnChainPendingTransaction,
      lockService,
    );
  }

  async processMessageInternal(transactionId: string) {
    let transaction = await this.transactionRepo.getTransaction(transactionId);
    const status = transaction.props.transactionStatus;

    if (status != TransactionStatus.CRYPTO_OUTGOING_COMPLETED) {
      this.logger.info(
        `Transaction ${transactionId} is not in ${TransactionStatus.CRYPTO_OUTGOING_COMPLETED} status, skipping, current status: ${status}`,
      );
      return;
    }

    const consumer = await this.consumerService.getConsumer(transaction.props.userId);
    const assetService: AssetService = this.assetServiceFactory.getAssetService(transaction.props.leg2);

    // Skip this if we already have a withdrawalID
    let withdrawalID = transaction.props.zhWithdrawalID;
    if (!withdrawalID) {
      const consumerWalletTransferRequest: ConsumerWalletTransferRequest = {
        amount: transaction.props.executedCrypto,
        assetId: transaction.props.leg2,
        walletAddress: transaction.props.destinationWalletAddress,
        consumer: consumer.props,
        transactionID: transaction.props._id,
      };
      withdrawalID = await assetService.transferToConsumerWallet(consumerWalletTransferRequest);
      transaction.props.zhWithdrawalID = withdrawalID;
      transaction = await this.transactionRepo.updateTransaction(transaction);
    }

    const withdrawalStatus: ConsumerWalletTransferStatus = await assetService.pollConsumerWalletTransferStatus(
      withdrawalID,
    );

    switch (withdrawalStatus.status) {
      case PollStatus.PENDING:
        return;

      case PollStatus.FAILURE:
        await this.processFailure(TransactionStatus.FAILED, withdrawalStatus.errorMessage, transaction);
        return;

      case PollStatus.SUCCESS:
        // TODO(#): Understand what should go in 'settledTimestamp'.
        // transaction.props.settledTimestamp = ??
        // TODO(#): Understand if we need to put a check here for equality.
        transaction.props.leg2Amount = withdrawalStatus.requestedAmount;
        transaction.props.settledAmount = withdrawalStatus.settledAmount;
        transaction.props.blockchainTransactionId = withdrawalStatus.onChainTransactionID;
        transaction = await this.transactionRepo.updateTransactionStatus(
          transaction.props._id,
          TransactionStatus.COMPLETED,
          transaction.props,
        );
    }

    const paymentMethod = consumer.getPaymentMethodByID(transaction.props.paymentMethodID);
    if (paymentMethod == null) {
      // Should never happen if we got this far
      this.logger.error(`Unknown payment method "${paymentMethod}" for consumer ${consumer.props._id}`);
      return;
    }

    // Make webhook callback to partner
    await this.transactionService.callTransactionConfirmWebhook(consumer, transaction);

    await this.emailService.sendOrderExecutedEmail(
      consumer.props.firstName,
      consumer.props.lastName,
      consumer.props.displayEmail,
      {
        transactionID: transaction.props._id,
        transactionTimestamp: transaction.props.transactionTimestamp,
        settledTimestamp: new Date(),
        transactionHash: transaction.props.blockchainTransactionId,
        paymentMethod: paymentMethod.cardType,
        last4Digits: paymentMethod.last4Digits,
        currencyCode: transaction.props.leg1,
        conversionRate: transaction.props.exchangeRate,
        processingFee: transaction.props.processingFee,
        networkFee: transaction.props.networkFee,
        nobaFee: transaction.props.nobaFee,
        totalPrice: transaction.props.leg1Amount,
        cryptoAmount: transaction.props.executedCrypto, // This will be the final settled amount; may differ from original
        cryptoCurrency: transaction.props.leg2,
        cryptoAmountExpected: transaction.props.leg2Amount, // This is the original quoted amount
        // TODO(#): Evaluate if we need to send "settledAmount" as well :)
      },
    );
  }
}
