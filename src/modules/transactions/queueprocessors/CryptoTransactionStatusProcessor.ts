import { Inject } from "@nestjs/common";
import { WINSTON_MODULE_PROVIDER } from "nest-winston";
import { ConsumerService } from "../../consumer/consumer.service";
import { Logger } from "winston";
import { TransactionStatus, TransactionQueueName } from "../domain/Types";
import { ITransactionRepo } from "../repo/TransactionRepo";
import { TransactionService } from "../transaction.service";
import { MessageProcessor } from "./message.processor";
import { SqsClient } from "./sqs.client";
import { LockService } from "../../../modules/common/lock.service";
import { AssetService } from "../assets/asset.service";
import { AssetServiceFactory } from "../assets/asset.service.factory";
import {
  ConsumerAccountTransferStatus,
  ConsumerWalletTransferRequest,
  ConsumerWalletTransferResponse,
  PollStatus,
} from "../domain/AssetTypes";
import { NotificationService } from "../../../modules/notifications/notification.service";
import { NotificationEventType } from "../../../modules/notifications/domain/NotificationTypes";

export class CryptoTransactionStatusProcessor extends MessageProcessor {
  constructor(
    @Inject(WINSTON_MODULE_PROVIDER) logger: Logger,
    @Inject("TransactionRepo") transactionRepo: ITransactionRepo,
    sqsClient: SqsClient,
    consumerService: ConsumerService,
    transactionService: TransactionService,
    lockService: LockService,
    private readonly notificationService: NotificationService,
    private readonly assetServiceFactory: AssetServiceFactory,
  ) {
    super(
      logger,
      transactionRepo,
      sqsClient,
      consumerService,
      transactionService,
      TransactionQueueName.CryptoTransactionInitiated,
      lockService,
    );
  }

  async processMessageInternal(transactionId: string) {
    let transaction = await this.transactionRepo.getTransaction(transactionId);
    const status = transaction.props.transactionStatus;
    if (status != TransactionStatus.CRYPTO_OUTGOING_INITIATED) {
      this.logger.info(
        `${transactionId}: Transaction with status ${status} should not be in queue ${TransactionQueueName.CryptoTransactionInitiated}`,
      );
      return;
    }

    const assetService: AssetService = await this.assetServiceFactory.getAssetService(transaction.props.leg2);

    this.logger.info(
      `${transactionId}: Checking the Consumer Account Transfer status for TransferID: "${transaction.props.cryptoTransactionId}"`,
    );

    const consumerAccountTransferStatus: ConsumerAccountTransferStatus =
      await assetService.pollAssetTransferToConsumerStatus(transaction.props.cryptoTransactionId);
    try {
      switch (consumerAccountTransferStatus.status) {
        case PollStatus.PENDING:
          return;

        case PollStatus.SUCCESS:
          break;

        case PollStatus.FAILURE:
          throw Error(consumerAccountTransferStatus.errorMessage);

        case PollStatus.FATAL_ERROR:
          // TODO(#): Add alert here.
          this.logger.error(
            `${transactionId}: Error while checking Asset Transfer state: ${consumerAccountTransferStatus.errorMessage}`,
          );
          throw Error(consumerAccountTransferStatus.errorMessage);
      }

      const consumer = await this.consumerService.getConsumer(transaction.props.userId);

      // Skip this if we already have a withdrawalID
      if (!transaction.props.zhWithdrawalID) {
        this.logger.info(`${transactionId}: Initiating the transfer to consumer wallet.`);

        const consumerWalletTransferRequest: ConsumerWalletTransferRequest = {
          amount: transaction.props.executedCrypto,
          assetId: transaction.props.leg2,
          walletAddress: transaction.props.destinationWalletAddress,
          consumer: consumer.props,
          transactionID: transaction.props._id,
          intermediateCryptoAsset: transaction.props.intermediaryLeg,
        };

        const consumerWalletTransferResponse: ConsumerWalletTransferResponse =
          await assetService.transferToConsumerWallet(consumerWalletTransferRequest);
        transaction.props.zhWithdrawalID = consumerWalletTransferResponse.liquidityProviderTransactionId;
        transaction.props.executedCrypto = consumerWalletTransferResponse.cryptoAmount
          ? consumerWalletTransferResponse.cryptoAmount
          : transaction.props.executedCrypto;

        this.logger.info(
          `${transactionId}: Initiated the transfer to consumer wallet with Withdrawal ID: "${transaction.props.zhWithdrawalID}"`,
        );
        transaction = await this.transactionRepo.updateTransaction(transaction);
      }

      // We either had a withdrawal ID from a prior run but failed to set the status
      // Or we got a withdrawal ID above and need to set the status.
      transaction = await this.transactionRepo.updateTransactionStatus(
        transaction.props._id,
        TransactionStatus.CRYPTO_OUTGOING_COMPLETED,
        transaction.props,
      );
    } catch (err) {
      this.logger.error(
        `${transactionId}: Caught exception in CryptoTransactionStatusProcessor. Moving to failed queue.`,
        err,
      );
      await this.processFailure(
        TransactionStatus.CRYPTO_OUTGOING_FAILED,
        "Failed to settle crypto transaction.", // TODO(#342): Need more detail here - should throw exception from cryptoTransactionStatus with detailed reason
        transaction,
      );

      const consumer = await this.consumerService.getConsumer(transaction.props.userId);
      const paymentMethod = consumer.getPaymentMethodByID(transaction.props.paymentMethodID);
      if (paymentMethod == null) {
        // Should never happen if we got this far
        this.logger.error(
          `${transactionId}: Unknown payment method "${paymentMethod}" for consumer ${consumer.props._id}`,
        );
        return;
      }

      // TODO: Check, we are already sending email in TransactionFailedProcessor. Is it needed here?
      await this.notificationService.sendNotification(
        NotificationEventType.SEND_CRYPTO_FAILED_EVENT,
        transaction.props.partnerID,
        {
          firstName: consumer.props.firstName,
          lastName: consumer.props.lastName,
          email: consumer.props.displayEmail,
          cryptoFailedParams: {
            transactionID: transaction.props._id,
            transactionTimestamp: transaction.props.transactionTimestamp,
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
            failureReason: "Failed to settle crypto transaction", // TODO: Better message
          },
        },
      );
      return;
    }
  }
}
