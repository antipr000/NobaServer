import {
  Prisma,
  Transaction as PrismaTransactionModel,
  TransactionEvent as PrismaTransactionEventModel,
} from "@prisma/client";
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
  UpdateTransaction,
  validateInputTransaction,
  validateSavedTransaction,
  validateUpdateTransaction,
} from "../domain/Transaction";
import { ITransactionRepo } from "./transaction.repo";
import { TransactionFilterOptionsDTO } from "../dto/TransactionFilterOptionsDTO";
import { PaginatedResult } from "../../../core/infra/PaginationTypes";
import { createPaginator } from "../../../infra/sql/paginate/PaginationPipeline";
import {
  convertToDomainTransactionEvent,
  InputTransactionEvent,
  TransactionEvent,
  validateInputTransactionEvent,
  validateSavedTransactionEvent,
} from "../domain/TransactionEvent";

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
        ...(inputTransaction.memo && { memo: inputTransaction.memo }),
        ...(inputTransaction.sessionKey && { sessionKey: inputTransaction.sessionKey }),
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

  async getFilteredTransactions(
    transactionFilterOptions: TransactionFilterOptionsDTO,
  ): Promise<PaginatedResult<Transaction>> {
    const paginator = createPaginator<Transaction>(
      transactionFilterOptions.pageOffset,
      transactionFilterOptions.pageLimit,
      convertToDomainTransaction,
    );
    const filterQuery: Prisma.TransactionFindManyArgs = {
      where: {
        OR: [
          {
            creditConsumerID: transactionFilterOptions.consumerID,
          },
          {
            debitConsumerID: transactionFilterOptions.consumerID,
          },
        ],
        ...(transactionFilterOptions.debitCurrency && { debitCurrency: transactionFilterOptions.debitCurrency }),
        ...(transactionFilterOptions.creditCurrency && { creditCurrency: transactionFilterOptions.creditCurrency }),
        ...(transactionFilterOptions.transactionStatus && { status: transactionFilterOptions.transactionStatus }),
        ...(transactionFilterOptions.startDate && {
          createdTimestamp: { gte: new Date(transactionFilterOptions.startDate) },
        }),
        ...(transactionFilterOptions.endDate && {
          updatedTimestamp: { lte: new Date(transactionFilterOptions.endDate) },
        }),
      },
    };

    return await paginator(this.prismaService.transaction, filterQuery);
  }

  async updateTransactionByTransactionID(
    transactionID: string,
    updateTransaction: UpdateTransaction,
  ): Promise<Transaction> {
    validateUpdateTransaction(updateTransaction);

    try {
      const transactionUpdate: Prisma.TransactionUpdateInput = {
        ...(updateTransaction.exchangeRate && { exchangeRate: updateTransaction.exchangeRate }),
        ...(updateTransaction.status && { status: updateTransaction.status }),
        ...(updateTransaction.memo && { memo: updateTransaction.memo }),
        ...(updateTransaction.debitAmount && { debitAmount: updateTransaction.debitAmount }),
        ...(updateTransaction.creditAmount && { creditAmount: updateTransaction.creditAmount }),
        ...(updateTransaction.debitCurrency && { debitCurrency: updateTransaction.debitCurrency }),
        ...(updateTransaction.creditCurrency && { creditCurrency: updateTransaction.creditCurrency }),
      };

      const returnedTransaction: PrismaTransactionModel = await this.prismaService.transaction.update({
        where: {
          id: transactionID,
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
        message: `Error updating the transaction with id: '${transactionID}'`,
      });
    }
  }

  async addTransactionEvent(inputTransactionEvent: InputTransactionEvent): Promise<TransactionEvent> {
    validateInputTransactionEvent(inputTransactionEvent);

    let savedTransactionEvent: TransactionEvent = null;

    try {
      const transactionEventInput: Prisma.TransactionEventUncheckedCreateInput = {
        transactionID: inputTransactionEvent.transactionID,
        internal: inputTransactionEvent.internal,
        message: inputTransactionEvent.message,
        ...(inputTransactionEvent.details && { details: inputTransactionEvent.details }),
        ...(inputTransactionEvent.key && { key: inputTransactionEvent.key }),
        ...(inputTransactionEvent.param1 && { param1: inputTransactionEvent.param1 }),
        ...(inputTransactionEvent.param2 && { param2: inputTransactionEvent.param2 }),
        ...(inputTransactionEvent.param3 && { param3: inputTransactionEvent.param3 }),
        ...(inputTransactionEvent.param4 && { param4: inputTransactionEvent.param4 }),
        ...(inputTransactionEvent.param5 && { param5: inputTransactionEvent.param5 }),
      };

      const returnedTransactionEvent: PrismaTransactionEventModel = await this.prismaService.transactionEvent.create({
        data: transactionEventInput,
      });
      savedTransactionEvent = convertToDomainTransactionEvent(returnedTransactionEvent);
    } catch (err) {
      this.logger.error(JSON.stringify(err));
      throw new DatabaseInternalErrorException({
        message: "Error saving transaction event in database",
      });
    }

    try {
      validateSavedTransactionEvent(savedTransactionEvent);
      return savedTransactionEvent;
    } catch (err) {
      this.logger.error(JSON.stringify(err));
      throw new InvalidDatabaseRecordException({
        message: "Invalid transaction event record",
      });
    }
  }

  async getTransactionEvents(
    transactionID: string,
    includeInternalEvents: boolean = false,
  ): Promise<TransactionEvent[]> {
    const allTransactionEvents = await this.prismaService.transactionEvent.findMany({
      where: {
        transactionID: transactionID,
        // If includeInternalEvents is true, don't restrict. If false, only return non-internal events
        ...(!includeInternalEvents && { internal: false }),
      },
    });
    if (!allTransactionEvents) return [];

    return allTransactionEvents.map(transactionEvent => convertToDomainTransactionEvent(transactionEvent));
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
