import { Prisma, Transaction as PrismaTransactionModel } from "@prisma/client";
import { Inject, Injectable } from "@nestjs/common";
import { WINSTON_MODULE_PROVIDER } from "nest-winston";
import {
  DatabaseInternalErrorException,
  InvalidDatabaseRecordException,
  NotFoundError,
} from "../../../core/exception/CommonAppException";
import { PrismaService } from "../../../infraproviders/PrismaService";
import { Logger } from "winston";
import {
  convertToDomainTransaction,
  InputTransaction,
  Transaction,
  validateInputTransaction,
  validateSavedTransaction,
  validateUpdateTransaction,
} from "../domain/Transaction";
import { ITransactionRepo } from "./transaction.repo";

@Injectable()
export class SQLTransactionRepo implements ITransactionRepo {
  constructor(
    private readonly prismaService: PrismaService,
    @Inject(WINSTON_MODULE_PROVIDER) private readonly logger: Logger,
  ) {}

  async createTransaction(inputTransaction: InputTransaction): Promise<Transaction> {
    validateInputTransaction(inputTransaction);

    let savedTransaction: Transaction = null;

    try {
      // Note that "createdTimestamp", "updatedTimestamp" & "ID" are not included in the input.
      // They are automatically generated by the database.
      const transactionInput: Prisma.TransactionCreateInput = {
        transactionRef: inputTransaction.transactionRef,
        workflowName: inputTransaction.workflowName,
        ...(inputTransaction.debitConsumerID && {
          debitConsumer: {
            connect: {
              id: inputTransaction.debitConsumerID,
            },
          },
        }),
        ...(inputTransaction.creditConsumerID && {
          creditConsumer: {
            connect: {
              id: inputTransaction.creditConsumerID,
            },
          },
        }),
        ...(inputTransaction.debitAmount && { debitAmount: inputTransaction.debitAmount }),
        ...(inputTransaction.creditAmount && { creditAmount: inputTransaction.creditAmount }),
        ...(inputTransaction.debitCurrency && { debitCurrency: inputTransaction.debitCurrency }),
        ...(inputTransaction.creditCurrency && { creditCurrency: inputTransaction.creditCurrency }),
        exchangeRate: inputTransaction.exchangeRate,
      };

      const returnedTransaction: PrismaTransactionModel = await this.prismaService.transaction.create({
        data: transactionInput,
      });
      savedTransaction = convertToDomainTransaction(returnedTransaction);
    } catch (err) {
      this.logger.error(JSON.stringify(err));
      throw new DatabaseInternalErrorException({
        message: "Error saving transaction in database",
      });
    }

    try {
      validateSavedTransaction(savedTransaction);
      return savedTransaction;
    } catch (err) {
      this.logger.error(JSON.stringify(err));
      throw new InvalidDatabaseRecordException({
        message: "Invalid database record",
      });
    }
  }

  async getTransactionByID(transactionID: string): Promise<Transaction> {
    try {
      const returnedTransaction: PrismaTransactionModel = await this.prismaService.transaction.findUnique({
        where: {
          id: transactionID,
        },
        include: {
          debitConsumer: false,
          creditConsumer: false,
        },
      });

      if (!returnedTransaction) {
        return null;
      }
      return convertToDomainTransaction(returnedTransaction);
    } catch (err) {
      this.logger.error(JSON.stringify(err));
      return null;
    }
  }

  async getTransactionByTransactionRef(transactionRef: string): Promise<Transaction> {
    try {
      const returnedTransaction: PrismaTransactionModel = await this.prismaService.transaction.findUnique({
        where: {
          transactionRef: transactionRef,
        },
        include: {
          debitConsumer: false,
          creditConsumer: false,
        },
      });

      if (!returnedTransaction) {
        return null;
      }
      return convertToDomainTransaction(returnedTransaction);
    } catch (err) {
      this.logger.error(JSON.stringify(err));
      return null;
    }
  }

  async getTransactionsByConsumerID(consumerID: string): Promise<Transaction[]> {
    try {
      const returnedTransactions: PrismaTransactionModel[] = await this.prismaService.transaction.findMany({
        where: {
          OR: [
            {
              creditConsumerID: consumerID,
            },
            {
              debitConsumerID: consumerID,
            },
          ],
        },
        include: {
          debitConsumer: false,
          creditConsumer: false,
        },
      });

      return returnedTransactions.map(transaction => convertToDomainTransaction(transaction));
    } catch (err) {
      this.logger.error(JSON.stringify(err));
      return [];
    }
  }

  async updateTransactionByTransactionRef(
    transactionRef: string,
    transaction: Partial<Transaction>,
  ): Promise<Transaction> {
    validateUpdateTransaction(transaction);

    try {
      const transactionUpdate: Prisma.TransactionUpdateInput = {
        ...(transaction.exchangeRate && { exchangeRate: transaction.exchangeRate }),
        ...(transaction.status && { status: transaction.status }),
        ...(transaction.debitAmount && { debitAmount: transaction.debitAmount }),
        ...(transaction.creditAmount && { creditAmount: transaction.creditAmount }),
        ...(transaction.debitCurrency && { debitCurrency: transaction.debitCurrency }),
        ...(transaction.creditCurrency && { creditCurrency: transaction.creditCurrency }),
      };

      const returnedTransaction: PrismaTransactionModel = await this.prismaService.transaction.update({
        where: {
          transactionRef: transactionRef,
        },
        data: transactionUpdate,
      });

      return convertToDomainTransaction(returnedTransaction);
    } catch (err) {
      this.logger.error(JSON.stringify(err));
      if (err.meta && err.meta.cause === "Record to update not found.") {
        throw new NotFoundError({});
      }
      throw new DatabaseInternalErrorException({
        message: `Error updating the transaction with transactionRef: '${transactionRef}'`,
      });
    }
  }

  async getTotalUserTransactionAmount(consumerID: string): Promise<number> {
    throw new Error("Method not implemented.");
  }

  async getMonthlyUserTransactionAmount(consumerID: string): Promise<number> {
    return this.getPeriodicUserTransactionAmount(consumerID, 30);
  }

  async getWeeklyUserTransactionAmount(consumerID: string): Promise<number> {
    return this.getPeriodicUserTransactionAmount(consumerID, 7);
  }

  async getDailyUserTransactionAmount(consumerID: string): Promise<number> {
    return this.getPeriodicUserTransactionAmount(consumerID, 1);
  }

  private async getPeriodicUserTransactionAmount(consumerID: string, days: number): Promise<number> {
    throw new Error("Method not implemented.");
    // TODO: Use Prisma groupBy with a _sum on amount https://www.prisma.io/docs/concepts/components/prisma-client/aggregation-grouping-summarizing
  }

  async getUserTransactionInAnInterval(consumerID: string, fromDate: Date, toDate: Date): Promise<Transaction[]> {
    throw new Error("Method not implemented.");
  }
}
