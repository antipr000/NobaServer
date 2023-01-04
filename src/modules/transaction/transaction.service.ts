import { Inject, Injectable } from "@nestjs/common";
import { Transaction } from "./domain/Transaction";
import { Consumer } from "../consumer/domain/Consumer";
import { TransactionFilterOptions } from "../transactions/domain/Types";
import { InitiateTransactionDTO } from "./dto/CreateTransactionDTO";
import { ITransactionRepo } from "./repo/transaction.repo";
import { WINSTON_MODULE_PROVIDER } from "nest-winston";
import { Logger } from "winston";
import { NotFoundError } from "../../core/exception/CommonAppException";
import { TRANSACTION_REPO_PROVIDER } from "./repo/transaction.repo.module";

@Injectable()
export class TransactionService {
  constructor(
    @Inject(TRANSACTION_REPO_PROVIDER) private readonly transactionRepo: ITransactionRepo,
    @Inject(WINSTON_MODULE_PROVIDER) private readonly logger: Logger,
  ) {}

  async getTransactionByTransactionRef(transactionRef: string, consumerID: string): Promise<Transaction> {
    const transaction: Transaction = await this.transactionRepo.getTransactionByTransactionRef(transactionRef);
    if (
      transaction === null ||
      (transaction.debitConsumerID !== consumerID && transaction.creditConsumerID !== consumerID)
    ) {
      throw new NotFoundError({
        message: "Transaction not found",
      });
    }
    return transaction;
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
