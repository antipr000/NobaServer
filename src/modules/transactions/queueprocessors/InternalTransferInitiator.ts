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
import { ConsumerAccountTransferRequest } from "../domain/AssetTypes";
import { CurrencyService } from "../../common/currency.service";
import { PartnerService } from "../../partner/partner.service";
import { WalletProviderService } from "../assets/wallet.provider.service";

export class InternalTransferInitiator extends MessageProcessor {
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
      TransactionQueueName.InternalTransferInitiator,
      lockService,
    );
  }

  async processMessageInternal(transactionId: string) {
    let transaction = await this.transactionRepo.getTransaction(transactionId);
    const status = transaction.props.transactionStatus;

    if (status != TransactionStatus.VALIDATION_PASSED) {
      this.logger.info(
        `${transactionId}: Transaction is not in ${TransactionStatus.VALIDATION_PASSED} status, skipping, current status: ${status}`,
      );
      return;
    }

    const consumer = await this.consumerService.getConsumer(transaction.props.userId);
    const assetService: AssetService = await this.assetServiceFactory.getAssetService(transaction.props.leg2);

    const balance = await this.transactionService.getParticipantBalance(
      consumer.props.zhParticipantCode,
      transaction.props.leg2,
    );
    const balanceAmount = balance != null && balance.length == 1 ? Number(balance[0].balance) : 0;
    if (balanceAmount < transaction.props.leg2Amount) {
      // Insufficient balance

      this.logger.info(
        `Consumer ${transaction.props.userId} attempted a trade with insufficient ${transaction.props.leg2Amount} balance (available: ${balanceAmount})`,
      );
      this.processFailure(
        TransactionStatus.FAILED,
        "Insufficient balance",
        transaction,
        `Insufficient ${transaction.props.leg2Amount} balance. Available balance: ${balanceAmount}`,
      );
      return;
    }

    this.logger.info(`${transactionId}: Starting the trade to transfer to consumer ZH account.`);

    const assetTransferToNobaAccountRequest: ConsumerAccountTransferRequest = {
      consumer: consumer.props,
      cryptoAssetTradePrice: transaction.props.exchangeRate,
      totalCryptoAmount: transaction.props.leg2Amount,
      fiatAmountPreSpread: transaction.props.amountPreSpread,
      totalFiatAmount: transaction.props.leg1Amount,
      cryptoCurrency: transaction.props.leg2,
      fiatCurrency: transaction.props.leg1,
      transactionID: transaction.props._id,
      transactionCreationTimestamp: transaction.props.transactionTimestamp,
    };

    const walletProviderService: WalletProviderService = this.assetServiceFactory.getWalletProviderService();
    const tradeId: string = await walletProviderService.transferAssetToNobaAccount(assetTransferToNobaAccountRequest);
    this.logger.info(`${transactionId}: Trade initiated to transfer to Noba ZH account with tradeID: "${tradeId}"`);

    transaction.props.cryptoTransactionId = tradeId;
    transaction = await this.transactionRepo.updateTransactionStatus(
      transaction.props._id,
      TransactionStatus.INTERNAL_TRANSFER_PENDING,
      transaction.props,
    );

    await this.sqsClient.enqueue(TransactionQueueName.InternalTransferInitiated, transactionId);
  }
}
