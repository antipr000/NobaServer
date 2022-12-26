import { Transaction } from "../domain/Transaction";

export interface ITransactionRepo {
  createTransaction(transaction: Transaction): Promise<Transaction>;
}
