import { InputTransaction, Transaction, UpdateTransaction } from "../domain/Transaction";
import { PaginatedResult } from "../../../core/infra/PaginationTypes";
import { TransactionFilterOptionsDTO } from "../dto/TransactionFilterOptionsDTO";
import { InputTransactionEvent, TransactionEvent } from "../domain/TransactionEvent";

export interface ITransactionRepo {
  createTransaction(inputTransaction: InputTransaction): Promise<Transaction>;
  getTransactionByID(transactionID: string): Promise<Transaction>;
  getTransactionByTransactionRef(transactionRef: string): Promise<Transaction>;
  getTransactionsByConsumerID(consumerID: string): Promise<Transaction[]>;
  updateTransactionByTransactionRef(transactionRef: string, transaction: UpdateTransaction): Promise<Transaction>;
  getFilteredTransactions(transactionFilterOptions: TransactionFilterOptionsDTO): Promise<PaginatedResult<Transaction>>;
  getUserTransactionInAnInterval(consumerID: string, fromDate: Date, toDate: Date): Promise<Transaction[]>;
  getTotalUserTransactionAmount(consumerID: string): Promise<number>;
  getMonthlyUserTransactionAmount(consumerID: string): Promise<number>;
  getWeeklyUserTransactionAmount(consumerID: string): Promise<number>;
  getDailyUserTransactionAmount(consumerID: string): Promise<number>;
  addTransactionEvent(inputTransactionEvent: InputTransactionEvent): Promise<TransactionEvent>;
  getTransactionEvents(transactionID: string, includeInternalEvents: boolean): Promise<TransactionEvent[]>;
}
