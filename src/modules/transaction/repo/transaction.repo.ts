import { Transaction } from "../domain/Transaction";

export interface ITransactionRepo {
  createTransaction(transaction: Transaction): Promise<Transaction>;
  getTransactionByID(transactionID: string): Promise<Transaction>;
  // getTransactionByTransactionRef(transactionRef: string): Promise<Transaction>;
  // getTransactionsByConsumerID(consumerID: string): Promise<Transaction[]>;
}
