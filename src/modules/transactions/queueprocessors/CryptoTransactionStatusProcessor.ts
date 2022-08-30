import { Inject } from "@nestjs/common";
import { WINSTON_MODULE_PROVIDER } from "nest-winston";
import { ConsumerService } from "../../consumer/consumer.service";
import { Logger } from "winston";
import { TransactionStatus, TransactionQueueName } from "../domain/Types";
import { ITransactionRepo } from "../repo/TransactionRepo";
import { TransactionService } from "../transaction.service";
import { MessageProcessor } from "./message.processor";
import { SqsClient } from "./sqs.client";
import { EmailService } from "../../../modules/common/email.service";
import { LockService } from "../../../modules/common/lock.service";
import { AssetService } from "../assets/asset.service";
import { AssetServiceFactory } from "../assets/asset.service.factory";
import { ConsumerAccountTransferStatus, PollStatus } from "../domain/AssetTypes";

export class CryptoTransactionStatusProcessor extends MessageProcessor {
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
      TransactionQueueName.CryptoTransactionInitiated,
      lockService,
    );
  }

  async processMessageInternal(transactionId: string) {
    let transaction = await this.transactionRepo.getTransaction(transactionId);
    const status = transaction.props.transactionStatus;
    if (status != TransactionStatus.CRYPTO_OUTGOING_INITIATED) {
      this.logger.info(
        `Transaction with status ${status} should not be in queue ${TransactionQueueName.CryptoTransactionInitiated}`,
      );
      return;
    }

    const assetService: AssetService = this.assetServiceFactory.getAssetService(transaction.props.leg2);
    const consumerAccountTransferStatus: ConsumerAccountTransferStatus =
      await assetService.pollAssetTransferToConsumerStatus(transaction.props.cryptoTransactionId);

    try {
      switch (consumerAccountTransferStatus.status) {
        case PollStatus.PENDING:
          return;

        case PollStatus.SUCCESS:
          transaction = await this.transactionRepo.updateTransactionStatus(
            transaction.props._id,
            TransactionStatus.CRYPTO_OUTGOING_COMPLETED,
            transaction.props,
          );
          return;

        case PollStatus.FAILURE:
          throw Error(consumerAccountTransferStatus.errorMessage);

        case PollStatus.FATAL_ERROR:
          // TODO(#): Add alert here.
          this.logger.error(`Error while checking Asset Transfer state: ${consumerAccountTransferStatus.errorMessage}`);
          throw Error(consumerAccountTransferStatus.errorMessage);
      }
    } catch (err) {
      this.logger.error("Caught exception in CryptoTransactionStatusProcessor. Moving to failed queue.", err);
      await this.processFailure(
        TransactionStatus.CRYPTO_OUTGOING_FAILED,
        "Failed to settle crypto transaction.", // TODO(#342): Need more detail here - should throw exception from cryptoTransactionStatus with detailed reason
        transaction,
      );

      const consumer = await this.consumerService.getConsumer(transaction.props.userId);
      const paymentMethod = consumer.getPaymentMethodByID(transaction.props.paymentMethodID);
      if (paymentMethod == null) {
        // Should never happen if we got this far
        this.logger.error(`Unknown payment method "${paymentMethod}" for consumer ${consumer.props._id}`);
        return;
      }

      // TODO: Check, we are already sending email in TransactionFailedProcessor. Is it needed here?
      await this.emailService.sendCryptoFailedEmail(
        consumer.props.firstName,
        consumer.props.lastName,
        consumer.props.displayEmail,
        {
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
      );
      return;
    }
  }
}
