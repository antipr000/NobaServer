import { PrismaService } from "../../../../infraproviders/PrismaService";
import { uuid } from "uuidv4";
import { PomeloCard } from "../domain/PomeloCard";
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

export const getRandomPomeloCard = (nobaCardID: string): PomeloCard => {
  return {
    id: uuid(),
    nobaCardID: nobaCardID,
    pomeloUserID: uuid(),
    pomeloCardID: uuid(),
    createdTimestamp: new Date(),
    updatedTimestamp: new Date(),
  };
};

export const createPomeloCard = async (
  consumerID: string,
  nobaCardID: string,
  prismaService: PrismaService,
): Promise<PomeloCard> => {
  const pomeloUser: PomeloUser = await createPomeloUser(consumerID, prismaService);
  const savedPomeloCard = await prismaService.pomeloCard.create({
    data: {
      nobaCard: {
        connect: {
          id: nobaCardID,
        },
      },
      pomeloUser: {
        connect: {
          pomeloID: pomeloUser.pomeloID,
        },
      },
      pomeloCardID: uuid(),
    },
  });

  return {
    id: savedPomeloCard.id,
    nobaCardID: savedPomeloCard.nobaCardID,
    pomeloCardID: savedPomeloCard.pomeloCardID,
    pomeloUserID: savedPomeloCard.pomeloUserID,
    createdTimestamp: savedPomeloCard.createdTimestamp,
    updatedTimestamp: savedPomeloCard.updatedTimestamp,
  };
};

export const createPomeloCardWithPredefinedPomeloUser = async (
  pomeloUserID: string,
  nobaCardID: string,
  prismaService: PrismaService,
): Promise<PomeloCard> => {
  const savedPomeloCard = await prismaService.pomeloCard.create({
    data: {
      nobaCard: {
        connect: {
          id: nobaCardID,
        },
      },
      pomeloUser: {
        connect: {
          pomeloID: pomeloUserID,
        },
      },
      pomeloCardID: uuid(),
    },
  });

  return {
    id: savedPomeloCard.id,
    nobaCardID: savedPomeloCard.nobaCardID,
    pomeloCardID: savedPomeloCard.pomeloCardID,
    pomeloUserID: savedPomeloCard.pomeloUserID,
    createdTimestamp: savedPomeloCard.createdTimestamp,
    updatedTimestamp: savedPomeloCard.updatedTimestamp,
  };
};
