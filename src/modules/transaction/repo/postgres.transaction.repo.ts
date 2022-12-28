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
  Transaction,
  validateInputTransaction,
  validateSavedTransaction,
  validateUpdateTransaction,
} from "../domain/Transaction";
import { ITransactionRepo } from "./transaction.repo";

@Injectable()
export class PostgresTransactionRepo implements ITransactionRepo {
  constructor(
    private readonly prismaService: PrismaService,
    @Inject(WINSTON_MODULE_PROVIDER) private readonly logger: Logger,
  ) {}

  async createTransaction(transaction: Transaction): Promise<Transaction> {
    validateInputTransaction(transaction);

    let savedTransaction: Transaction = null;

    try {
      // Note that "createdTimestamp", "updatedTimestamp" & "ID" are not included in the input.
      // They are automatically generated by the database.
      const transactionInput: Prisma.TransactionCreateInput = {
        transactionRef: transaction.transactionRef,
        workflowName: transaction.workflowName,
        consumer: {
          connect: {
            id: transaction.consumerID,
          },
        },
        amount: transaction.amount,
        currency: transaction.currency,
        exchangeRate: transaction.exchangeRate,
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
          consumer: false,
        },
      });

      if (!returnedTransaction) {
        return null;
      }
      return convertToDomainTransaction(returnedTransaction);
    } catch (err) {
      this.logger.error(JSON.stringify(err));
      throw new DatabaseInternalErrorException({
        message: `Error retrieving the transaction with ID: '${transactionID}'`,
      });
    }
  }

  async getTransactionByTransactionRef(transactionRef: string): Promise<Transaction> {
    try {
      const returnedTransaction: PrismaTransactionModel = await this.prismaService.transaction.findUnique({
        where: {
          transactionRef: transactionRef,
        },
        include: {
          consumer: false,
        },
      });

      if (!returnedTransaction) {
        return null;
      }
      return convertToDomainTransaction(returnedTransaction);
    } catch (err) {
      this.logger.error(JSON.stringify(err));
      throw new DatabaseInternalErrorException({
        message: `Error retrieving the transaction with transactionRef: '${transactionRef}'`,
      });
    }
  }

  async getTransactionsByConsumerID(consumerID: string): Promise<Transaction[]> {
    try {
      const returnedTransactions: PrismaTransactionModel[] = await this.prismaService.transaction.findMany({
        where: {
          consumerID: consumerID,
        },
        include: {
          consumer: false,
        },
      });

      return returnedTransactions.map(transaction => convertToDomainTransaction(transaction));
    } catch (err) {
      this.logger.error(JSON.stringify(err));
      throw new DatabaseInternalErrorException({
        message: `Error retrieving the transactions for consumer with ID: '${consumerID}'`,
      });
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
}
