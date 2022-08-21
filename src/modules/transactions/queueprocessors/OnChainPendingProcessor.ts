import { Inject } from "@nestjs/common";
import { WINSTON_MODULE_PROVIDER } from "nest-winston";
import { Logger } from "winston";
import { Transaction } from "../domain/Transaction";
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
import { ConsumerWalletTransferRequest } from "../domain/AssetTypes";

export class OnChainPendingProcessor extends MessageProcessor {
  constructor(
    @Inject(WINSTON_MODULE_PROVIDER) logger: Logger,
    @Inject("TransactionRepo") transactionRepo: ITransactionRepo,
    sqsClient: SqsClient,
    consumerService: ConsumerService,
    transactionService: TransactionService,
    lockService: LockService,
    private readonly zerohashService: ZeroHashService,
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
        amount: transaction.props.leg2Amount,
        assetId: transaction.props.leg2,
        walletAddress: transaction.props.destinationWalletAddress,
        consumer: consumer.props,
        transactionId: transaction.props._id,
      };
      withdrawalID = await assetService.transferToConsumerWallet(consumerWalletTransferRequest);
      transaction.props.zhWithdrawalID = withdrawalID;
      await this.transactionRepo.updateTransaction(transaction);
      console.log("Set zhWithdrawalID on transaction to " + withdrawalID);
    }

    // No need to guard this with an intermediate Transaction state
    // as this processor is idempotent.
    const withdrawalResponse = await this.zerohashService.getWithdrawal(withdrawalID);
    this.logger.debug("Withdrawal Response: " + JSON.stringify(withdrawalResponse));

    const withdrawalStatus = withdrawalResponse["message"][0]["status"];
    /*
    From ZH docs:
    Status
    - PENDING	The request has been created and is pending approval from users
    - APPROVED	The request is approved but not settled
    - REJECTED	The request is rejected and in a terminal state
    - SETTLED	The request was settled and sent for confirmation onchain if a digital asset
    */
    if (withdrawalStatus === "PENDING" || withdrawalStatus == "APPROVED") {
      this.logger.debug(`Transaction ${transactionId} still in ${withdrawalStatus} status`);
      return; // Will requeue, in which we wait until not pending or approved
    } else if (withdrawalStatus === "REJECTED") {
      // TODO: What to do with the transaction?
      return;
    } else if (withdrawalStatus === "SETTLED") {
      this.logger.debug("Withdrawal completed");
    } else {
      this.logger.error(`Unknown withdrawal status: ${withdrawalStatus}`);
      // TODO: What to do with the transaction?
      return;
    }

    const onChainStatus = withdrawalResponse["message"][0]["on_chain_status"];
    if (onChainStatus === "PENDING") {
      // no-op
      // TODO(#): Update the transaction timestamp.
      return;
    } else if (onChainStatus === "CONFIRMED") {
      // Final amount of crypto
      const originalAmount = transaction.props.leg2Amount;
      const settledTimestamp = new Date();
      const finalSettledAmount = withdrawalResponse["message"][0]["settled_amount"];
      const transactionHash = withdrawalResponse["message"][0]["transaction_id"];
      await this.transactionRepo.updateTransactionStatus(transaction.props._id, TransactionStatus.COMPLETED, {
        ...transaction.props,
        settledTimestamp: settledTimestamp, // This doesn't seem to come from ZH so this is the best we can do
        leg2Amount: finalSettledAmount,
        blockchainTransactionId: transactionHash,
      });

      const paymentMethod = consumer.getPaymentMethodByID(transaction.props.paymentMethodID);
      if (paymentMethod == null) {
        // Should never happen if we got this far
        this.logger.error(`Unknown payment method "${paymentMethod}" for consumer ${consumer.props._id}`);
        return;
      }

      await this.emailService.sendOrderExecutedEmail(
        consumer.props.firstName,
        consumer.props.lastName,
        consumer.props.displayEmail,
        {
          transactionID: transaction.props._id,
          transactionTimestamp: transaction.props.transactionTimestamp,
          settledTimestamp: settledTimestamp,
          transactionHash: transaction.props.blockchainTransactionId,
          paymentMethod: paymentMethod.cardType,
          last4Digits: paymentMethod.last4Digits,
          currencyCode: transaction.props.leg1,
          conversionRate: transaction.props.exchangeRate,
          processingFee: transaction.props.processingFee,
          networkFee: transaction.props.networkFee,
          nobaFee: transaction.props.nobaFee,
          totalPrice: transaction.props.leg1Amount,
          cryptoAmount: transaction.props.leg2Amount,
          cryptoCurrency: transaction.props.leg2, // This will be the final settled amount; may differ from original
          cryptoAmountExpected: originalAmount, // This is the original quoted amount
        },
      );
    } else if (onChainStatus != null) {
      // Totally valid for it to be null, so we don't care about that here. We only want to log if it's a non-null unknown status.
      this.logger.error(`Unknown on_chain_status: ${onChainStatus} for transaction id ${transaction.props._id}`);
    }
  }
}
