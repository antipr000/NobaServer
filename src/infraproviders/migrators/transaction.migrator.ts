import { Injectable } from "@nestjs/common";
import { DBProvider } from "../DBProvider";
import { Collection } from "mongodb";
import { Transaction, TransactionProps } from "../..//modules/transactions/domain/Transaction";
import { PaymentProvider } from "../..//modules/consumer/domain/PaymentProvider";
import { TransactionStatus } from "../..//modules/transactions/domain/Types";

@Injectable()
export class TransactionMigrator {
  constructor(private readonly dbProvider: DBProvider) {}

  private async saveDocumentToTransactionCollection(transaction: any) {
    const transactionModel = await this.dbProvider.getTransactionModel();
    await transactionModel
      .updateOne(
        { _id: transaction.props._id },
        // !!!!!!!!!  ALERT  !!!!!!!!!!
        // "$unset" preset doesn't work because we're using "mongoose" & the schema doesn't have specified fields.
        // !!!!!!!!!  ALERT  !!!!!!!!!!
        { $unset: { paymentMethodID: true, checkoutPaymentID: true }, $set: transaction.props },
      )
      .exec();
  }

  private isFiatPaymentCompleted(status: TransactionStatus): boolean {
    const fiatPaymentCompletionMapping = {
      [TransactionStatus.PENDING]: false,
      [TransactionStatus.VALIDATION_FAILED]: false,
      [TransactionStatus.VALIDATION_PASSED]: false,

      [TransactionStatus.FIAT_INCOMING_INITIATED]: false,
      [TransactionStatus.FIAT_INCOMING_COMPLETED]: true,
      [TransactionStatus.FIAT_INCOMING_FAILED]: false,
      [TransactionStatus.FIAT_REVERSAL_INITIATING]: false,
      [TransactionStatus.FIAT_INCOMING_REVERSAL_INITIATED]: false,
      [TransactionStatus.FIAT_INCOMING_REVERSAL_FAILED]: false,
      [TransactionStatus.FIAT_INCOMING_REVERSED]: false,

      [TransactionStatus.CRYPTO_OUTGOING_INITIATING]: true,
      [TransactionStatus.CRYPTO_OUTGOING_INITIATED]: true,
      [TransactionStatus.CRYPTO_OUTGOING_COMPLETED]: true,
      [TransactionStatus.CRYPTO_OUTGOING_FAILED]: true,

      [TransactionStatus.COMPLETED]: true,
      [TransactionStatus.FAILED]: false,
    };

    return fiatPaymentCompletionMapping[status];
  }

  // Any error here would crash the application and that is intentional.
  private convertToNewSchema(queriedTransactionRecord: any): TransactionProps {
    const isOnOlderSchema: boolean =
      queriedTransactionRecord.fiatPaymentInfo === undefined || queriedTransactionRecord.fiatPaymentInfo === null;

    if (!isOnOlderSchema) return queriedTransactionRecord;

    const migratedRecord: TransactionProps = {
      _id: queriedTransactionRecord._id,
      transactionID: queriedTransactionRecord.transactionID,
      userId: queriedTransactionRecord.userId,
      sessionKey: queriedTransactionRecord.sessionKey,
      fiatPaymentInfo: {
        paymentMethodID: queriedTransactionRecord.paymentMethodID,
        // There is no other provider except "CHECKOUT"
        paymentProvider: PaymentProvider.CHECKOUT,
        paymentID: queriedTransactionRecord.checkoutPaymentID,
        isCompleted: this.isFiatPaymentCompleted(queriedTransactionRecord.transactionStatus),
        isApproved: this.isFiatPaymentCompleted(queriedTransactionRecord.transactionStatus),
        isFailed: false,
        details: [],
      },
      sourceWalletAddress: queriedTransactionRecord.sourceWalletAddress,
      destinationWalletAddress: queriedTransactionRecord.destinationWalletAddress,
      leg1Amount: queriedTransactionRecord.leg1Amount,
      leg2Amount: queriedTransactionRecord.leg2Amount,
      leg1: queriedTransactionRecord.leg1,
      leg2: queriedTransactionRecord.leg2,
      intermediaryLeg: queriedTransactionRecord.intermediaryLeg,
      intermediaryLegAmount: queriedTransactionRecord.intermediaryLegAmount,
      smartContractData: queriedTransactionRecord.smartContractData,
      fixedSide: queriedTransactionRecord.fixedSide,
      type: queriedTransactionRecord.type,
      partnerID: queriedTransactionRecord.partnerID,
      tradeQuoteID: queriedTransactionRecord.tradeQuoteID,
      nobaTransferTradeID: queriedTransactionRecord.nobaTransferTradeID,
      nobaTransferSettlementID: queriedTransactionRecord.nobaTransferSettlementID,
      nobaFee: queriedTransactionRecord.nobaFee,
      processingFee: queriedTransactionRecord.processingFee,
      networkFee: queriedTransactionRecord.networkFee,
      exchangeRate: queriedTransactionRecord.exchangeRate,
      buyRate: queriedTransactionRecord.buyRate,
      diagnosis: queriedTransactionRecord.diagnosis,
      cryptoTransactionId: queriedTransactionRecord.cryptoTransactionId,
      settledAmount: queriedTransactionRecord.settledAmount,
      blockchainTransactionId: queriedTransactionRecord.blockchainTransactionId,
      transactionStatus: queriedTransactionRecord.transactionStatus,
      transactionTimestamp: queriedTransactionRecord.transactionTimestamp,
      settledTimestamp: queriedTransactionRecord.settledTimestamp,
      zhWithdrawalID: queriedTransactionRecord.zhWithdrawalID,
      executedQuoteTradeID: queriedTransactionRecord.executedQuoteTradeID,
      executedQuoteSettledTimestamp: queriedTransactionRecord.executedQuoteSettledTimestamp,
      executedCrypto: queriedTransactionRecord.executedCrypto,
      amountPreSpread: queriedTransactionRecord.amountPreSpread,
      lastProcessingTimestamp: queriedTransactionRecord.lastProcessingTimestamp,
      lastStatusUpdateTimestamp: queriedTransactionRecord.lastStatusUpdateTimestamp,
      transactionExceptions: queriedTransactionRecord.transactionExceptions,
      discounts: queriedTransactionRecord.discounts,
    };

    return migratedRecord;
  }

  private async readAndConvertTheEntireCollection(transactionCollection: Collection): Promise<Transaction[]> {
    const transactionDocumentCursor = transactionCollection.find({});
    const allUpdatedRecords: Transaction[] = [];

    while (await transactionDocumentCursor.hasNext()) {
      let transactionDocument = await transactionDocumentCursor.next();
      const migratedTransactionDocument = this.convertToNewSchema(transactionDocument);

      // Updating the row while the cursor is pointing to that might be error prone.
      // So, storing all the converted records into an in-memory structure.
      allUpdatedRecords.push(
        Transaction.createTransaction({
          ...migratedTransactionDocument,
          _id: migratedTransactionDocument._id as any,
        }),
      );
    }

    return allUpdatedRecords;
  }

  // This is idempotent and safe to re-run after any failures/crash.
  public async migrate() {
    console.log("Migrating the 'PaymentMethods' Card Details of 'Consumer' collection ...");

    const transactionModel = await this.dbProvider.getTransactionModel();

    const transactionCollection: Collection = transactionModel.collection;
    const allMigratedRecords: Transaction[] = await this.readAndConvertTheEntireCollection(transactionCollection);

    const allOperations = [];
    allMigratedRecords.forEach(record => {
      allOperations.push(this.saveDocumentToTransactionCollection(record));
    });

    await Promise.all(allOperations);
    console.log("Updated all the transaction records successfully!");
  }
}
