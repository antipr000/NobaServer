import { Mono as PrismaMonoModel, Prisma } from "@prisma/client";
import { Inject, Injectable } from "@nestjs/common";
import { WINSTON_MODULE_PROVIDER } from "nest-winston";
import { PrismaService } from "../../../../infraproviders/PrismaService";
import { Logger } from "winston";
import {
  convertToDomainTransaction,
  MonoTransaction,
  MonoTransactionCreateRequest,
  MonoTransactionState,
  MonoTransactionUpdateRequest,
  validateCreateMonoTransactionRequest,
  validateMonoTransaction,
  validateUpdateMonoTransactionRequest,
} from "../../domain/Mono";
import { IMonoRepo } from "./mono.repo";
import {
  DatabaseInternalErrorException,
  InvalidDatabaseRecordException,
  NotFoundError,
} from "../../../../core/exception/CommonAppException";

@Injectable()
export class SqlMonoRepo implements IMonoRepo {
  constructor(
    private readonly prismaService: PrismaService,
    @Inject(WINSTON_MODULE_PROVIDER) private readonly logger: Logger,
  ) {}

  async createMonoTransaction(request: MonoTransactionCreateRequest): Promise<MonoTransaction> {
    validateCreateMonoTransactionRequest(request);

    let savedTransaction: MonoTransaction = null;

    try {
      // Note that "createdTimestamp", "updatedTimestamp" & "ID" are not included in the input.
      // They are automatically generated by the database.
      const transactionInput: Prisma.MonoCreateInput = {
        transaction: {
          connect: {
            id: request.nobaTransactionID,
          },
        },
        collectionLinkID: request.collectionLinkID,
        collectionURL: request.collectionURL,
        state: MonoTransactionState.PENDING,
      };

      const returnedTransaction: PrismaMonoModel = await this.prismaService.mono.create({
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
      validateMonoTransaction(savedTransaction);
      return savedTransaction;
    } catch (err) {
      this.logger.error(JSON.stringify(err));
      throw new InvalidDatabaseRecordException({
        message: "Invalid database record",
      });
    }
  }

  async updateMonoTransaction(
    nobaTransactionID: string,
    request: MonoTransactionUpdateRequest,
  ): Promise<MonoTransaction> {
    validateUpdateMonoTransactionRequest(request);

    try {
      const transactionUpdate: Prisma.MonoUpdateInput = {
        ...(request.state && { state: request.state }),
        ...(request.monoTransactionID && { monoTransactionID: request.monoTransactionID }),
      };

      const returnedTransaction: PrismaMonoModel = await this.prismaService.mono.update({
        where: {
          nobaTransactionID: nobaTransactionID,
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
        message: `Error updating the Mono transaction with nobaTransactionID: '${nobaTransactionID}'`,
      });
    }
  }

  async getMonoTransactionByNobaTransactionID(nobaTransactionID: string): Promise<MonoTransaction> {
    try {
      const returnedTransaction: PrismaMonoModel = await this.prismaService.mono.findUnique({
        where: {
          nobaTransactionID: nobaTransactionID,
        },
      });

      if (!returnedTransaction) {
        return null;
      }

      return convertToDomainTransaction(returnedTransaction);
    } catch (err) {
      this.logger.error(JSON.stringify(err));
      throw new DatabaseInternalErrorException({
        message: `Error getting the Mono transaction with nobaTransactionID: '${nobaTransactionID}'`,
      });
    }
  }

  async getMonoTransactionByCollectionLinkID(collectionLinkID: string): Promise<MonoTransaction> {
    try {
      const returnedTransaction: PrismaMonoModel = await this.prismaService.mono.findUnique({
        where: {
          collectionLinkID: collectionLinkID,
        },
      });

      if (!returnedTransaction) {
        return null;
      }

      return convertToDomainTransaction(returnedTransaction);
    } catch (err) {
      this.logger.error(JSON.stringify(err));
      throw new DatabaseInternalErrorException({
        message: `Error getting the Mono transaction with collectionLinkID: '${collectionLinkID}'`,
      });
    }
  }
}
