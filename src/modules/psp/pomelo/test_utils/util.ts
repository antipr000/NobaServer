import { PrismaService } from "../../../../infraproviders/PrismaService";
import { uuid } from "uuidv4";
import { PomeloCard } from "../domain/PomeloCard";
import { PomeloUser } from "../domain/PomeloUser";
import { PomeloCurrency, PomeloTransaction } from "../domain/PomeloTransaction";

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

export const createPomeloTransaction = async (
  pomeloCardID: string,
  nobaTransactionID: string,
  prismaService: PrismaService,
): Promise<PomeloTransaction> => {
  const savedTransaction = await prismaService.pomeloTransaction.create({
    data: {
      pomeloCard: {
        connect: {
          pomeloCardID: pomeloCardID,
        },
      },
      nobaTransactionID: nobaTransactionID,
      pomeloTransactionID: uuid(),
      amountInUSD: 10,
      amountInLocalCurrency: 500,
      localCurrency: PomeloCurrency.COP,
    },
  });

  return {
    id: savedTransaction.id,
    pomeloTransactionID: savedTransaction.pomeloTransactionID,
    pomeloCardID: savedTransaction.pomeloCardID,
    nobaTransactionID: savedTransaction.nobaTransactionID,
    amountInUSD: savedTransaction.amountInUSD,
    amountInLocalCurrency: savedTransaction.amountInLocalCurrency,
    localCurrency: savedTransaction.localCurrency as PomeloCurrency,
    createdTimestamp: savedTransaction.createdTimestamp,
    updatedTimestamp: savedTransaction.updatedTimestamp,
  };
};

export const getRandomPomeloTransaction = (pomeloCardID: string, nobaTransactionID: string): PomeloTransaction => {
  return {
    id: uuid(),
    pomeloTransactionID: uuid(),
    pomeloCardID: pomeloCardID,
    nobaTransactionID: nobaTransactionID,
    amountInUSD: 10,
    amountInLocalCurrency: 500,
    localCurrency: PomeloCurrency.COP,
    createdTimestamp: new Date(),
    updatedTimestamp: new Date(),
  };
};
