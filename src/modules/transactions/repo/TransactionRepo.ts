import { Transaction, TransactionProps } from "../domain/Transaction";
import { TransactionStatus, TransactionFilterOptions } from "../domain/Types";
import { PaginatedResult } from "../../../core/infra/PaginationTypes";

export interface ITransactionRepo {
  getAll(): Promise<Transaction[]>; //this is to be used by app admins. TODO pagination? transaction filter options?
  getTransaction(transactionId: string): Promise<Transaction>;
  createTransaction(transaction: Transaction): Promise<Transaction>;
  updateTransaction(transaction: Transaction): Promise<Transaction>;
  updateTransactionStatus(
    transactionId: string,
    newStatus: TransactionStatus,
    otherProps: Partial<TransactionProps>,
  ): Promise<Transaction>;
  updateLastProcessingTimestamp(transactionId: string): Promise<Transaction>;
  getUserTransactions(
    userId: string,
    partnerID: string,
    transactionFilterOptions?: TransactionFilterOptions,
  ): Promise<PaginatedResult<Transaction>>; //TODO pagination? transaction filter options?
  getPartnerTransactions(
    partnerID: string,
    transactionsFilterOptions?: TransactionFilterOptions,
  ): Promise<PaginatedResult<Transaction>>;
  getUserTransactionInAnInterval(
    userId: string,
    partnerID: string,
    fromDate: Date,
    toDate: Date,
  ): Promise<Transaction[]>;
  getTotalUserTransactionAmount(userId: string): Promise<number>;
  getMonthlyUserTransactionAmount(userId: string): Promise<number>;
  getWeeklyUserTransactionAmount(userId: string): Promise<number>;
  getDailyUserTransactionAmount(userId: string): Promise<number>;

  getValidTransactionsToProcess(
    maxLastUpdateTime: number,
    minStatusUpdateTime: number,
    status: TransactionStatus,
  ): Promise<Transaction[]>;
  getStaleTransactionsToProcess(
    maxLastUpdateTime: number,
    minStatusUpdateTime: number,
    status: TransactionStatus,
  ): Promise<Transaction[]>;

  updateStatusWithExactTransactionProps(
    transactionId: string,
    newStatus: TransactionStatus,
    transactionState: TransactionProps,
  ): Promise<Transaction>;
}
