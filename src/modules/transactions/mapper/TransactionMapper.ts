import { Utils } from "../../../core/utils/Utils";
import { Mapper } from "../../../core/infra/Mapper";
import { Transaction } from "../domain/Transaction";
import { TransactionDTO } from "../dto/TransactionDTO";

export class TransactionMapper implements Mapper<Transaction> {
  // TODO: Move this calculation as a part of transaction object
  private static calculateTotalFees(processingFee: number, networkFee: number, nobaFee: number): number {
    return (
      Utils.roundTo2DecimalNumber(processingFee) +
      Utils.roundTo2DecimalNumber(networkFee) +
      Utils.roundTo2DecimalNumber(nobaFee)
    );
  }

  toDTO(t: Transaction): TransactionDTO {
    const props = t.props;
    return {
      _id: props._id,
      transactionID: props.transactionID,
      userID: props.userId,
      status: props.transactionStatus,
      transactionHash: props.blockchainTransactionId,
      transactionTimestamp: props.transactionTimestamp,
      destinationWalletAddress: props.destinationWalletAddress,
      partnerID: props.partnerID,
      paymentMethodID: props.fiatPaymentInfo.paymentMethodID,
      type: props.type,
      amounts: {
        baseAmount: props.leg1Amount, // Will need a new actual baseAmount property when we take other fiat currencies
        fiatAmount: props.leg1Amount,
        fiatCurrency: props.leg1,
        cryptoQuantityExpected: props.leg2Amount,
        cryptoAmountSettled: props.executedCrypto,
        cryptocurrency: props.leg2,
        processingFee: props.processingFee,
        networkFee: props.networkFee,
        nobaFee: props.nobaFee,
        totalFiatPrice: props.leg1Amount,
        conversionRate: props.exchangeRate,
        totalFee: TransactionMapper.calculateTotalFees(props.processingFee, props.networkFee, props.nobaFee),
      },
    };
  }

  toDomain(t: any): Transaction {
    return Transaction.createTransaction(t);
  }
}
