import { uuid } from "uuidv4";
import { PrismaService } from "../../../../infraproviders/PrismaService";
import { CardProvider, NobaCard, NobaCardStatus, NobaCardType } from "../domain/NobaCard";

export const createNobaCard = async (
  consumerID: string,
  cardProvider: CardProvider,
  prismaService: PrismaService,
): Promise<NobaCard> => {
  const savedNobaCard = await prismaService.nobaCard.create({
    data: {
      consumer: {
        connect: {
          id: consumerID,
        },
      },
      type: NobaCardType.VIRTUAL,
      status: NobaCardStatus.ACTIVE,
      provider: cardProvider,
    },
  });

  return {
    id: savedNobaCard.id,
    consumerID: savedNobaCard.consumerID,
    provider: savedNobaCard.provider as CardProvider,
    status: savedNobaCard.status as NobaCardStatus,
    type: savedNobaCard.type as NobaCardType,
    createdTimestamp: savedNobaCard.createdTimestamp,
    updatedTimestamp: savedNobaCard.updatedTimestamp,
  };
};
