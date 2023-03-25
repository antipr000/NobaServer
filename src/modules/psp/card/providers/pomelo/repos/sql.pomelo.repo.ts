import { Inject, Injectable } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import { WINSTON_MODULE_PROVIDER } from "nest-winston";
import { PrismaService } from "../../../../../../infraproviders/PrismaService";
import { Logger } from "winston";
import { PomeloUser as PrismaPomeloUserModel } from "@prisma/client";
import { PomeloCard as PrismaPomeloCardModel } from "@prisma/client";
import { NobaCard as PrismaNobaCardModel } from "@prisma/client";
import { PomeloTransaction as PrismaPomeloTransactionModel } from "@prisma/client";
import {
  convertToDomainPomeloUser,
  PomeloUser,
  PomeloUserSaveRequest,
  validatePomeloUser,
  validateSavePomeloUserRequest,
} from "../domain/PomeloUser";
import { PomeloRepo } from "./pomelo.repo";
import { RepoErrorCode, RepoException } from "../../../../../../core/exception/repo.exception";
import {
  PomeloCard,
  convertToDomainPomeloCard,
  PomeloCardSaveRequest,
  PomeloCardUpdateRequest,
  validateSavePomeloCardRequest,
  validateUpdatePomeloCardRequest,
} from "../domain/PomeloCard";
import {
  convertToDomainPomeloTransaction,
  PomeloTransactionSaveRequest,
  PomeloTransaction,
  validateSavePomeloTransactionRequest,
  validatePomeloTransaction,
} from "../domain/PomeloTransaction";
import { CardProvider, convertToDomainNobaCard, validateNobaCard, NobaCard } from "../../../domain/NobaCard";

@Injectable()
export class SQLPomeloRepo implements PomeloRepo {
  constructor(
    private readonly prismaService: PrismaService,
    @Inject(WINSTON_MODULE_PROVIDER) private readonly logger: Logger,
  ) {}

  async createPomeloUser(request: PomeloUserSaveRequest): Promise<PomeloUser> {
    validateSavePomeloUserRequest(request);

    let savedPomeloUser: PomeloUser = null;

    try {
      // Note that "createdTimestamp", "updatedTimestamp" & "ID" are not included in the input.
      // They are automatically generated by the database.
      const pomeloUserInput: Prisma.PomeloUserCreateInput = {
        consumer: {
          connect: {
            id: request.consumerID,
          },
        },
        pomeloID: request.pomeloUserID,
      };

      const returnedPomeloUser: PrismaPomeloUserModel = await this.prismaService.pomeloUser.create({
        data: pomeloUserInput,
      });
      savedPomeloUser = convertToDomainPomeloUser(returnedPomeloUser);
    } catch (err) {
      this.logger.error(JSON.stringify(err));
      throw new RepoException({
        errorCode: RepoErrorCode.DATABASE_INTERNAL_ERROR,
        message: "Error saving transaction in database",
      });
    }

    try {
      validatePomeloUser(savedPomeloUser);
      return savedPomeloUser;
    } catch (err) {
      this.logger.error(JSON.stringify(err));
      throw new RepoException({
        errorCode: RepoErrorCode.INVALID_DATABASE_RECORD,
        message: "Invalid database record",
      });
    }
  }

  async getPomeloUserByConsumerID(consumerID: string): Promise<PomeloUser> {
    try {
      const returnedPomeloUser: PrismaPomeloUserModel = await this.prismaService.pomeloUser.findUnique({
        where: {
          consumerID: consumerID,
        },
      });

      if (!returnedPomeloUser) {
        return null;
      }

      return convertToDomainPomeloUser(returnedPomeloUser);
    } catch (err) {
      this.logger.error(JSON.stringify(err));
      throw new RepoException({
        errorCode: RepoErrorCode.DATABASE_INTERNAL_ERROR,
        message: `Error getting the Pomelo user with consumerID: '${consumerID}'`,
      });
    }
  }

  async getPomeloUserByPomeloID(pomeloUserID: string): Promise<PomeloUser> {
    try {
      const returnedPomeloUser: PrismaPomeloUserModel = await this.prismaService.pomeloUser.findUnique({
        where: {
          pomeloID: pomeloUserID,
        },
      });

      if (!returnedPomeloUser) {
        return null;
      }

      return convertToDomainPomeloUser(returnedPomeloUser);
    } catch (err) {
      this.logger.error(JSON.stringify(err));
      throw new RepoException({
        errorCode: RepoErrorCode.DATABASE_INTERNAL_ERROR,
        message: `Error getting the Pomelo user with pomeloUserID: '${pomeloUserID}'`,
      });
    }
  }

  async createPomeloCard(request: PomeloCardSaveRequest): Promise<NobaCard> {
    validateSavePomeloCardRequest(request);

    let savedNobaCard: NobaCard = null;

    try {
      // Note that "createdTimestamp", "updatedTimestamp" & "ID" are not included in the input.
      // They are automatically generated by the database.
      const cardInput: Prisma.NobaCardCreateInput = {
        consumer: {
          connect: {
            id: request.nobaConsumerID,
          },
        },
        pomeloCard: {
          create: {
            pomeloCardID: request.pomeloCardID,
            pomeloUser: {
              connect: {
                pomeloID: request.pomeloUserID,
              },
            },
          },
        },
        provider: CardProvider.POMELO,
        status: request.status,
        last4Digits: request.last4Digits,
        type: request.type,
      };

      const returnedCard: PrismaNobaCardModel = await this.prismaService.nobaCard.create({
        data: cardInput,
      });
      savedNobaCard = convertToDomainNobaCard(returnedCard);
    } catch (err) {
      this.logger.error(JSON.stringify(err));
      throw new RepoException({
        errorCode: RepoErrorCode.DATABASE_INTERNAL_ERROR,
        message: "Error saving transaction in database",
      });
    }

    try {
      validateNobaCard(savedNobaCard);
      return savedNobaCard;
    } catch (err) {
      this.logger.error(JSON.stringify(err));
      throw new RepoException({
        errorCode: RepoErrorCode.INVALID_DATABASE_RECORD,
        message: "Invalid database record",
      });
    }
  }

  async updatePomeloCard(request: PomeloCardUpdateRequest): Promise<NobaCard> {
    validateUpdatePomeloCardRequest(request);

    try {
      const pomeloCardUpdate: Prisma.NobaCardUpdateInput = {
        status: request.status,
      };

      const returnedNobaCard: PrismaNobaCardModel = await this.prismaService.nobaCard.update({
        where: {
          id: request.nobaCardID,
        },
        data: pomeloCardUpdate,
      });

      return convertToDomainNobaCard(returnedNobaCard);
    } catch (err) {
      this.logger.error(JSON.stringify(err));
      if (err.meta && err.meta.cause === "Record to update not found.") {
        throw new RepoException({
          errorCode: RepoErrorCode.NOT_FOUND,
          message: `Pomelo Card with nobaCardID: '${request.nobaCardID}' was not found.`,
        });
      }
      throw new RepoException({
        errorCode: RepoErrorCode.DATABASE_INTERNAL_ERROR,
        message: "Error updating record in database",
      });
    }
  }

  async getPomeloCardByPomeloCardID(pomeloCardID: string): Promise<PomeloCard> {
    try {
      const returnedPomeloCard: PrismaPomeloCardModel = await this.prismaService.pomeloCard.findUnique({
        where: {
          pomeloCardID: pomeloCardID,
        },
      });

      if (!returnedPomeloCard) {
        return null;
      }

      return convertToDomainPomeloCard(returnedPomeloCard);
    } catch (err) {
      this.logger.error(JSON.stringify(err));
      throw new RepoException({
        errorCode: RepoErrorCode.DATABASE_INTERNAL_ERROR,
        message: `Error getting the Pomelo Card with pomeloCardID: '${pomeloCardID}'`,
      });
    }
  }

  async getPomeloCardByNobaCardID(nobaCardID: string): Promise<PomeloCard> {
    try {
      const returnedPomeloCard: PrismaPomeloCardModel = await this.prismaService.pomeloCard.findUnique({
        where: {
          nobaCardID: nobaCardID,
        },
      });

      if (!returnedPomeloCard) {
        return null;
      }

      return convertToDomainPomeloCard(returnedPomeloCard);
    } catch (err) {
      this.logger.error(JSON.stringify(err));
      throw new RepoException({
        errorCode: RepoErrorCode.DATABASE_INTERNAL_ERROR,
        message: `Error getting the Pomelo Card with nobaCardID: '${nobaCardID}'`,
      });
    }
  }

  async createPomeloTransaction(request: PomeloTransactionSaveRequest): Promise<PomeloTransaction> {
    validateSavePomeloTransactionRequest(request);

    let savedPomeloTransaction: PomeloTransaction = null;

    try {
      // Note that "createdTimestamp", "updatedTimestamp" & "ID" are not included in the input.
      // They are automatically generated by the database.
      const transactionInput: Prisma.PomeloTransactionCreateInput = {
        pomeloCard: {
          connect: {
            pomeloCardID: request.pomeloCardID,
          },
        },
        pomeloTransactionID: request.pomeloTransactionID,
        nobaTransactionID: request.nobaTransactionID,
        amountInUSD: request.amountInUSD,
        amountInLocalCurrency: request.amountInLocalCurrency,
        localCurrency: request.localCurrency,
      };

      const returnedTransaction: PrismaPomeloTransactionModel = await this.prismaService.pomeloTransaction.create({
        data: transactionInput,
      });
      savedPomeloTransaction = convertToDomainPomeloTransaction(returnedTransaction);
    } catch (err) {
      this.logger.error(JSON.stringify(err));
      throw new RepoException({
        errorCode: RepoErrorCode.DATABASE_INTERNAL_ERROR,
        message: "Error saving transaction in database",
      });
    }

    try {
      validatePomeloTransaction(savedPomeloTransaction);
      return savedPomeloTransaction;
    } catch (err) {
      this.logger.error(JSON.stringify(err));
      throw new RepoException({
        errorCode: RepoErrorCode.INVALID_DATABASE_RECORD,
        message: "Invalid database record",
      });
    }
  }

  async getPomeloTransactionByNobaTransactionID(nobaTransactionID: string): Promise<PomeloTransaction> {
    try {
      const returnedPomeloTransaction: PrismaPomeloTransactionModel =
        await this.prismaService.pomeloTransaction.findUnique({
          where: {
            nobaTransactionID: nobaTransactionID,
          },
        });

      if (!returnedPomeloTransaction) {
        return null;
      }

      return convertToDomainPomeloTransaction(returnedPomeloTransaction);
    } catch (err) {
      this.logger.error(JSON.stringify(err));
      throw new RepoException({
        errorCode: RepoErrorCode.DATABASE_INTERNAL_ERROR,
        message: `Error getting the Pomelo Transaction with nobaTransactionID: '${nobaTransactionID}'`,
      });
    }
  }
}
