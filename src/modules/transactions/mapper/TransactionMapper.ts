import { Transaction } from "../domain/Transaction";
import { Mapper } from "../../../core/infra/Mapper";
import { TransactionDTO } from "../dto/TransactionDTO";

export class TransactionMapper implements Mapper<Transaction> {
  toDTO(t: Transaction): TransactionDTO {
    const props = t.props;
    return {
      _id: props._id,
      status: props.transactionStatus,
      leg1: props.leg1,
      leg2: props.leg2,
      leg1Amount: props.leg1Amount,
      leg2Amount: props.leg2Amount,
      paymentMethodId: props.paymentMethodId,
      fiatTransactionId: props.stripePaymentIntentId,
      cryptoTransactionId: props.cryptoTransactionId,
      destinationWalletAdress: props.destinationWalletAddress,
      transactionTimestamp: props.transactionTimestamp,
    };
  }

  toDomain(t: any): Transaction {
    return Transaction.createTransaction(t);
  }
}
