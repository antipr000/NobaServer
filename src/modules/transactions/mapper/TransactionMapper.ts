import { Mapper } from "../../../core/infra/Mapper";
import { Transaction } from "../domain/Transaction";
import { TransactionDTO } from "../dto/TransactionDTO";

export class TransactionMapper implements Mapper<Transaction> {
  toDTO(t: Transaction): TransactionDTO {
    const props = t.props;
    return {
      _id: props._id,
      userID: props.userId,
      status: props.transactionStatus,
      leg1: props.leg1,
      leg2: props.leg2,
      type: props.type,
      baseAmount: props.leg1Amount,
      leg1Amount: props.leg1Amount,
      leg2Amount: props.leg2Amount,
      paymentMethodID: props.paymentMethodID,
      fiatTransactionID: props.checkoutPaymentID,
      cryptoTransactionID: props.cryptoTransactionId,
      destinationWalletAddress: props.destinationWalletAddress,
      transactionTimestamp: props.transactionTimestamp,
      partnerID: props.partnerID,
    };
  }

  toDomain(t: any): Transaction {
    return Transaction.createTransaction(t);
  }
}
