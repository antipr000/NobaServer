import { Inject } from "@nestjs/common";
import { WINSTON_MODULE_PROVIDER } from "nest-winston";
import { ConsumerService } from "../../consumer/consumer.service";
import { Logger } from "winston";
import { TransactionQueueName, TransactionStatus } from "../domain/Types";
import { ITransactionRepo } from "../repo/TransactionRepo";
import { TransactionService } from "../transaction.service";
import { SqsClient } from "./sqs.client";
import { MessageProcessor } from "./message.processor";
import { LockService } from "../../common/lock.service";
import { AssetServiceFactory } from "../assets/asset.service.factory";
import { AssetService } from "../assets/asset.service";
import { ConsumerAccountTransferStatus, PollStatus } from "../domain/AssetTypes";

export class InternalTransferStatusProcessor extends MessageProcessor {
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
      TransactionQueueName.InternalTransferInitiated,
      lockService,
    );
  }

  async processMessageInternal(transactionId: string) {
    let transaction = await this.transactionRepo.getTransaction(transactionId);
    const status = transaction.props.transactionStatus;

    if (status != TransactionStatus.INTERNAL_TRANSFER_PENDING) {
      this.logger.info(
        `${transactionId}: Transaction is not in ${TransactionStatus.INTERNAL_TRANSFER_PENDING} status, skipping, current status: ${status}`,
      );
      return;
    }

    const assetService: AssetService = await this.assetServiceFactory.getAssetService(transaction.props.leg2);

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
      // We either had a withdrawal ID from a prior run but failed to set the status
      // Or we got a withdrawal ID above and need to set the status.
      transaction = await this.transactionRepo.updateTransactionStatus(
        transaction.props._id,
        TransactionStatus.COMPLETED,
        transaction.props,
      );
    } catch (err) {
      this.logger.error(
        `${transactionId}: Caught exception in CryptoTransactionStatusProcessor. Moving to failed queue.`,
        err,
      );
      await this.processFailure(
        TransactionStatus.FAILED,
        "Failed to perform internal transfer.", // TODO(#342): Need more detail here - should throw exception from cryptoTransactionStatus with detailed reason
        transaction,
        err.message,
      );

      /*
    await this.notificationService.sendNotification(
      NotificationEventType.SEND_CRYPTO_FAILED_EVENT,
      transaction.props.partnerID,
      {
        firstName: consumer.props.firstName,
        lastName: consumer.props.lastName,
        nobaUserID: consumer.props._id,
        email: consumer.props.displayEmail,
        cryptoFailedParams: {
          transactionID: transaction.props.transactionID,
          transactionTimestamp: transaction.props.transactionTimestamp,
          paymentMethod: paymentMethod.cardData.cardType,
          last4Digits: paymentMethod.cardData.last4Digits,
          fiatCurrency: transaction.props.leg1,
          conversionRate: transaction.props.exchangeRate,
          processingFee: transaction.props.processingFee,
          networkFee: transaction.props.networkFee,
          nobaFee: transaction.props.nobaFee,
          totalPrice: transaction.props.leg1Amount,
          cryptoAmount: transaction.props.executedCrypto, // This will be the final settled amount; may differ from original
          cryptocurrency: transaction.props.leg2,
          destinationWalletAddress: transaction.props.destinationWalletAddress,
          status: transaction.props.transactionStatus,
          failureReason: "Failed to settle crypto transaction", // TODO: Better message
        },
      },
    );*/
    }
  }
}
