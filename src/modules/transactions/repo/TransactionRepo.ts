import { Transaction, TransactionProps } from "../domain/Transaction";
import { TransactionStatus, TransactionFilterOptions, TransactionType } from "../domain/Types";
import { PaginatedResult } from "../../../core/infra/PaginationTypes";
import { UpdateFiatTransactionInfoRequest } from "../domain/TransactionRepoTypes";

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
  getFilteredTransactions(transactionFilterOptions?: TransactionFilterOptions): Promise<PaginatedResult<Transaction>>;
  getUserTransactionInAnInterval(userId: string, fromDate: Date, toDate: Date): Promise<Transaction[]>;
  getTotalUserTransactionAmount(userId: string): Promise<number>;
  getMonthlyUserTransactionAmount(userId: string): Promise<number>;
  getWeeklyUserTransactionAmount(userId: string): Promise<number>;
  getDailyUserTransactionAmount(userId: string): Promise<number>;
  getUserACHUnsettledTransactionAmount(userId: string, achPaymentMethodIds: string[]): Promise<number>;

  getValidTransactionsToProcess(
    maxLastUpdateTime: number,
    minStatusUpdateTime: number,
    status: TransactionStatus,
    type: TransactionType[],
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

  updateFiatTransactionInfo(request: UpdateFiatTransactionInfoRequest): Promise<void>;
}
