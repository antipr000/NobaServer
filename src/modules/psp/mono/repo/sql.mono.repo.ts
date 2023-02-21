import { Mono as PrismaMonoModel, Prisma } from "@prisma/client";
import { Inject, Injectable } from "@nestjs/common";
import { WINSTON_MODULE_PROVIDER } from "nest-winston";
import { PrismaService } from "../../../../infraproviders/PrismaService";
import { Logger } from "winston";
import {
  convertToDomainTransaction,
  MonoTransaction,
  MonoTransactionSaveRequest,
  MonoTransactionState,
  MonoTransactionUpdateRequest,
  validateSaveMonoTransactionRequest,
  validateMonoTransaction,
  validateUpdateMonoTransactionRequest,
} from "../../domain/Mono";
import { IMonoRepo } from "./mono.repo";
import { RepoErrorCode, RepoException } from "../../../../core/exception/repo.exception";

@Injectable()
export class SqlMonoRepo implements IMonoRepo {
  constructor(
    private readonly prismaService: PrismaService,
    @Inject(WINSTON_MODULE_PROVIDER) private readonly logger: Logger,
  ) {}

  async createMonoTransaction(request: MonoTransactionSaveRequest): Promise<MonoTransaction> {
    validateSaveMonoTransactionRequest(request);

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
        type: request.type,
        state: MonoTransactionState.PENDING,

        ...(request.collectionLinkDepositDetails && {
          collectionLinkID: request.collectionLinkDepositDetails.collectionLinkID,
          collectionURL: request.collectionLinkDepositDetails.collectionURL,
        }),
        ...(request.withdrawalDetails && {
          transferID: request.withdrawalDetails.transferID,
          batchID: request.withdrawalDetails.batchID,
          declinationReason: request.withdrawalDetails.declinationReason,
        }),
      };

      const returnedTransaction: PrismaMonoModel = await this.prismaService.mono.create({
        data: transactionInput,
      });
      savedTransaction = convertToDomainTransaction(returnedTransaction);
    } catch (err) {
      this.logger.error(JSON.stringify(err));
      throw new RepoException({
        errorCode: RepoErrorCode.DATABASE_INTERNAL_ERROR,
        message: "Error saving transaction in database",
      });
    }

    try {
      validateMonoTransaction(savedTransaction);
      return savedTransaction;
    } catch (err) {
      this.logger.error(JSON.stringify(err));
      throw new RepoException({
        errorCode: RepoErrorCode.INVALID_DATABASE_RECORD,
        message: "Invalid database record",
      });
    }
  }

  async updateMonoTransaction(id: string, request: MonoTransactionUpdateRequest): Promise<MonoTransaction> {
    validateUpdateMonoTransactionRequest(request);

    try {
      const transactionUpdate: Prisma.MonoUpdateInput = {
        ...(request.state && { state: request.state }),
        ...(request.monoPaymentTransactionID && { monoPaymentTransactionID: request.monoPaymentTransactionID }),
        ...(request.declinationReason && { declinationReason: request.declinationReason }),
      };

      const returnedTransaction: PrismaMonoModel = await this.prismaService.mono.update({
        where: {
          id: id,
        },
        data: transactionUpdate,
      });

      return convertToDomainTransaction(returnedTransaction);
    } catch (err) {
      this.logger.error(JSON.stringify(err));
      if (err.meta && err.meta.cause === "Record to update not found.") {
        throw new RepoException({
          errorCode: RepoErrorCode.NOT_FOUND,
          message: `Mono transaction with ID: '${id}' not found`,
        });
      }
      throw new RepoException({
        errorCode: RepoErrorCode.DATABASE_INTERNAL_ERROR,
        message: `Error updating the Mono transaction with ID: '${id}'`,
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
      throw new RepoException({
        errorCode: RepoErrorCode.DATABASE_INTERNAL_ERROR,
        message: `Error getting the Mono transaction with nobaTransactionID: '${nobaTransactionID}'`,
      });
    }
  }

  async getMonoTransactionByCollectionLinkID(collectionLinkID: string): Promise<MonoTransaction> {
    try {
      const returnedTransaction: PrismaMonoModel = await this.prismaService.mono.findFirst({
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
      throw new RepoException({
        errorCode: RepoErrorCode.DATABASE_INTERNAL_ERROR,
        message: `Error getting the Mono transaction with collectionLinkID: '${collectionLinkID}'`,
      });
    }
  }

  async getMonoTransactionByTransferID(transferID: string): Promise<MonoTransaction> {
    try {
      const returnedTransaction: PrismaMonoModel = await this.prismaService.mono.findFirst({
        where: {
          transferID: transferID,
        },
      });

      if (!returnedTransaction) {
        return null;
      }

      return convertToDomainTransaction(returnedTransaction);
    } catch (err) {
      this.logger.error(JSON.stringify(err));
      throw new RepoException({
        errorCode: RepoErrorCode.DATABASE_INTERNAL_ERROR,
        message: `Error getting the Mono transaction with transferID: '${transferID}'`,
      });
    }
  }
}
