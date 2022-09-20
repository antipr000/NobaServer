import { Mapper } from "../../../core/infra/Mapper";
import { Transaction, transactionJoiSchema } from "../domain/Transaction";
import { TransactionDTO } from "../dto/TransactionDTO";

export class TransactionMapper implements Mapper<Transaction> {
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
      paymentMethodID: props.paymentMethodID,
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
      },
    };
  }

  toDomain(t: any): Transaction {
    return Transaction.createTransaction(t);
  }
}
