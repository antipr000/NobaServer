import { Inject, Injectable } from "@nestjs/common";
import { NobaCard as PrismaNobaCardModel } from "@prisma/client";
import { WINSTON_MODULE_PROVIDER } from "nest-winston";
import { PrismaService } from "../../../../infraproviders/PrismaService";
import { Logger } from "winston";
import { convertToDomainNobaCard, NobaCard } from "../domain/NobaCard";
import { NobaCardRepo } from "./card.repo";
import { RepoErrorCode, RepoException } from "../../../../core/exception/repo.exception";

@Injectable()
export class SQLNobaCardRepo implements NobaCardRepo {
  constructor(
    private readonly prismaService: PrismaService,
    @Inject(WINSTON_MODULE_PROVIDER) private readonly logger: Logger,
  ) {}

  async getCardsByConsumerID(consumerID: string): Promise<NobaCard[]> {
    try {
      const returnedNobaCards: PrismaNobaCardModel[] = await this.prismaService.nobaCard.findMany({
        where: {
          consumerID: consumerID,
        },
      });

      const nobaCards: NobaCard[] = returnedNobaCards.map(prismaNobaCard => convertToDomainNobaCard(prismaNobaCard));
      return nobaCards;
    } catch (err) {
      this.logger.error(JSON.stringify(err));
      throw new RepoException({
        errorCode: RepoErrorCode.DATABASE_INTERNAL_ERROR,
        message: `Error getting the Noba Cards for consumerID: '${consumerID}'`,
      });
    }
  }

  async getCardByID(id: string): Promise<NobaCard> {
    try {
      const returnedNobaCard: PrismaNobaCardModel = await this.prismaService.nobaCard.findUnique({
        where: {
          id: id,
        },
      });

      if (!returnedNobaCard) {
        return null;
      }

      return convertToDomainNobaCard(returnedNobaCard);
    } catch (err) {
      this.logger.error(JSON.stringify(err));
      throw new RepoException({
        errorCode: RepoErrorCode.DATABASE_INTERNAL_ERROR,
        message: `Error getting the Noba Card with ID: '${id}'`,
      });
    }
  }
}
