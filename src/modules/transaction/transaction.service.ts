import { Injectable } from "@nestjs/common";
import { Transaction } from "./domain/Transaction";
import { Consumer } from "../consumer/domain/Consumer";
import { TransactionFilterOptions } from "../transactions/domain/Types";
import { InitiateTransactionDTO } from "./dto/CreateTransactionDTO";

@Injectable()
export class TransactionService {
  async getTransaction(transactionRef: string, consumerID: string): Promise<Transaction> {
    throw new Error("Not implemented!");
  }

  async getFilteredTransactions(filter: TransactionFilterOptions): Promise<Transaction[]> {
    throw new Error("Not implemented!");
  }

  async initiateTransaction(
    orderDetails: InitiateTransactionDTO,
    consumer: Consumer,
    sessionKey: string,
  ): Promise<string> {
    throw new Error("Not implemented!");
  }

  async calculateExchangeRate(baseCurrency: string, targetCurrency: string): Promise<string> {
    throw new Error("Not implemented!");
  }
}
