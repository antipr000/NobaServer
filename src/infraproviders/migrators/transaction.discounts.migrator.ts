import { Injectable } from "@nestjs/common";
import { DBProvider } from "../DBProvider";
import { Collection } from "mongodb";
import { Transaction, TransactionProps } from "../..//modules/transactions/domain/Transaction";

@Injectable()
export class TransactionDiscountsMigrator {
  constructor(private readonly dbProvider: DBProvider) {}

  private async saveDocumentToTransactionCollection(transaction: any) {
    const transactionModel = await this.dbProvider.getTransactionModel();
    await transactionModel.findByIdAndUpdate(transaction.props._id, { $set: transaction.props }).exec();
  }

  // Any error here would crash the application and that is intentional.
  private convertToNewSchema(queriedTransactionRecord: any): TransactionProps {
    const isOnOlderSchema: boolean =
      queriedTransactionRecord.discounts === undefined || queriedTransactionRecord.discounts === null;

    if (!isOnOlderSchema) return queriedTransactionRecord;

    const migratedRecord: TransactionProps = {
      _id: queriedTransactionRecord._id,
      transactionID: queriedTransactionRecord.transactionID,
      userId: queriedTransactionRecord.userId,
      sessionKey: queriedTransactionRecord.sessionKey,
      fiatPaymentInfo: queriedTransactionRecord.fiatPaymentInfo,
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
      discounts: {
        fixedCreditCardFeeDiscount: 0,
        nobaFeeDiscount: 0,
        dynamicCreditCardFeeDiscount: 0,
        networkFeeDiscount: 0,
        spreadDiscount: 0,
      },
    };

    return migratedRecord;
  }

  private async readAndConvertTheEntireCollection(transactionCollection: Collection): Promise<Transaction[]> {
    const transactionDocumentCursor = transactionCollection.find({});
    const allUpdatedRecords: Transaction[] = [];

    while (await transactionDocumentCursor.hasNext()) {
      const transactionDocument = await transactionDocumentCursor.next();
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
    console.log("Migrating the 'discounts' in the 'Transaction' collection ...");

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
