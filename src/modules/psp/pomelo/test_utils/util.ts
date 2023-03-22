import { PrismaService } from "../../../../infraproviders/PrismaService";
import { uuid } from "uuidv4";
import { PomeloCard, PomeloCardStatus, PomeloCardType } from "../domain/PomeloCard";
import { PomeloUser } from "../domain/PomeloUser";

export const getRandomPomeloUser = (consumerID: string): PomeloUser => {
  return {
    id: uuid(),
    consumerID: consumerID,
    pomeloID: uuid(),
    createdTimestamp: new Date(),
    updatedTimestamp: new Date(),
  };
};

export const createPomeloUser = async (consumerID: string, prismaService: PrismaService): Promise<PomeloUser> => {
  const savedPomeloUser = await prismaService.pomeloUser.create({
    data: {
      pomeloID: uuid(),
      consumer: {
        connect: {
          id: consumerID,
        },
      },
    },
  });

  return {
    id: savedPomeloUser.id,
    consumerID: savedPomeloUser.consumerID,
    pomeloID: savedPomeloUser.pomeloID,
    createdTimestamp: savedPomeloUser.createdTimestamp,
    updatedTimestamp: savedPomeloUser.updatedTimestamp,
  };
};

export const getRandomPomeloCard = (consumerID: string): PomeloCard => {
  return {
    id: uuid(),
    nobaConsumerID: consumerID,
    pomeloID: uuid(),
    status: PomeloCardStatus.ACTIVE,
    type: PomeloCardType.VIRTUAL,
    createdTimestamp: new Date(),
    updatedTimestamp: new Date(),
  };
};

export const createPomeloCard = async (consumerID: string, prismaService: PrismaService): Promise<PomeloCard> => {
  const savedPomeloCard = await prismaService.pomeloCard.create({
    data: {
      pomeloID: uuid(),
      consumer: {
        connect: {
          id: consumerID,
        },
      },
      status: PomeloCardStatus.ACTIVE,
      type: PomeloCardType.VIRTUAL,
    },
  });

  return {
    id: savedPomeloCard.id,
    nobaConsumerID: savedPomeloCard.nobaConsumerID,
    pomeloID: savedPomeloCard.pomeloID,
    status: savedPomeloCard.status as PomeloCardStatus,
    type: savedPomeloCard.type as PomeloCardType,
    createdTimestamp: savedPomeloCard.createdTimestamp,
    updatedTimestamp: savedPomeloCard.updatedTimestamp,
  };
};
