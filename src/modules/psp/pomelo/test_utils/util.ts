import { PomeloUser } from "@prisma/client";
import { PrismaService } from "../../../../infraproviders/PrismaService";
import { uuid } from "uuidv4";

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
