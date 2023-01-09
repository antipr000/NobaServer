import { InputTransaction, Transaction, UpdateTransaction } from "../domain/Transaction";

export interface ITransactionRepo {
  createTransaction(inputTransaction: InputTransaction): Promise<Transaction>;
  getTransactionByID(transactionID: string): Promise<Transaction>;
  getTransactionByTransactionRef(transactionRef: string): Promise<Transaction>;
  getTransactionsByConsumerID(consumerID: string): Promise<Transaction[]>;
  updateTransactionByTransactionRef(transactionRef: string, transaction: UpdateTransaction): Promise<Transaction>;
  //getFilteredTransactions(transactionFilterOptions?: TransactionFilterOptions): Promise<PaginatedResult<Transaction>>;

  getUserTransactionInAnInterval(consumerID: string, fromDate: Date, toDate: Date): Promise<Transaction[]>;
  getTotalUserTransactionAmount(consumerID: string): Promise<number>;
  getMonthlyUserTransactionAmount(consumerID: string): Promise<number>;
  getWeeklyUserTransactionAmount(consumerID: string): Promise<number>;
  getDailyUserTransactionAmount(consumerID: string): Promise<number>;
}
