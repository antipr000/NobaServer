import { PrismaService } from "../../../../infraproviders/PrismaService";
import { uuid } from "uuidv4";
import { PomeloCard } from "../../domain/PomeloCard";
import { PomeloUser } from "../../domain/PomeloUser";
import {
  PomeloCurrency,
  PomeloEntryMode,
  PomeloOrigin,
  PomeloPointType,
  PomeloSource,
  PomeloTransaction,
  PomeloTransactionStatus,
  PomeloTransactionType,
} from "../../domain/PomeloTransaction";

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

export const createPomeloCardWithPomeloUser = async (
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
  pomeloUserID: string,
  nobaTransactionID: string,
  parentPomeloTransactionID: string,
  otherInputs: Partial<PomeloTransaction>,
  prismaService: PrismaService,
): Promise<PomeloTransaction> => {
  const savedTransaction = await prismaService.pomeloTransaction.create({
    data: {
      pomeloCard: {
        connect: {
          pomeloCardID: pomeloCardID,
        },
      },
      pomeloUser: {
        connect: {
          pomeloID: pomeloUserID,
        },
      },
      ...(parentPomeloTransactionID && {
        parentPomeloTransaction: {
          connect: {
            pomeloTransactionID: parentPomeloTransactionID,
          },
        },
      }),
      nobaTransactionID: nobaTransactionID,

      pomeloIdempotencyKey: otherInputs.pomeloIdempotencyKey ?? uuid(),
      settlementDate: otherInputs.settlementDate ?? "2022-05-22",
      pomeloTransactionID: otherInputs.pomeloTransactionID ?? uuid(),
      amountInUSD: otherInputs.amountInUSD ?? 10,
      localAmount: otherInputs.localAmount ?? 500,
      localCurrency: otherInputs.localCurrency ?? PomeloCurrency.COP,
      settlementAmount: otherInputs.settlementAmount ?? 10,
      settlementCurrency: otherInputs.settlementCurrency ?? PomeloCurrency.USD,
      transactionAmount: otherInputs.transactionAmount ?? 500,
      transactionCurrency: otherInputs.transactionCurrency ?? PomeloCurrency.COP,
      pomeloTransactionType: otherInputs.pomeloTransactionType ?? PomeloTransactionType.PURCHASE,
      pointType: otherInputs.pointType ?? PomeloPointType.ECOMMERCE,
      entryMode: otherInputs.entryMode ?? PomeloEntryMode.CONTACTLESS,
      countryCode: otherInputs.countryCode ?? "COL",
      origin: otherInputs.origin ?? PomeloOrigin.DOMESTIC,
      source: otherInputs.source ?? PomeloSource.CLEARING,
      status: otherInputs.status ?? PomeloTransactionStatus.PENDING,
      merchantName: otherInputs.merchantName ?? "MERCHANT NAME",
      merchantMCC: otherInputs.merchantMCC ?? "MCC",
    },
  });

  return {
    id: savedTransaction.id,
    pomeloTransactionID: savedTransaction.pomeloTransactionID,
    settlementDate: savedTransaction.settlementDate,
    parentPomeloTransactionID: savedTransaction.parentPomeloTransactionID,
    pomeloIdempotencyKey: savedTransaction.pomeloIdempotencyKey,
    pomeloCardID: savedTransaction.pomeloCardID,
    pomeloUserID: savedTransaction.pomeloUserID,
    nobaTransactionID: savedTransaction.nobaTransactionID,
    amountInUSD: savedTransaction.amountInUSD,
    localAmount: savedTransaction.localAmount,
    localCurrency: savedTransaction.localCurrency as PomeloCurrency,
    settlementAmount: savedTransaction.settlementAmount,
    settlementCurrency: savedTransaction.settlementCurrency as PomeloCurrency,
    transactionAmount: savedTransaction.transactionAmount,
    transactionCurrency: savedTransaction.transactionCurrency as PomeloCurrency,
    pomeloTransactionType: savedTransaction.pomeloTransactionType as PomeloTransactionType,
    pointType: savedTransaction.pointType as PomeloPointType,
    entryMode: savedTransaction.entryMode as PomeloEntryMode,
    countryCode: savedTransaction.countryCode,
    origin: savedTransaction.origin as PomeloOrigin,
    source: savedTransaction.source as PomeloSource,
    status: savedTransaction.status as PomeloTransactionStatus,
    merchantName: savedTransaction.merchantName,
    merchantMCC: savedTransaction.merchantMCC,
    createdTimestamp: savedTransaction.createdTimestamp,
    updatedTimestamp: savedTransaction.updatedTimestamp,
  };
};

export const getRandomPomeloTransaction = (
  pomeloCardID: string,
  pomeloUserID: string,
  nobaTransactionID: string,
): PomeloTransaction => {
  return {
    id: uuid(),
    pomeloIdempotencyKey: uuid(),
    pomeloTransactionID: uuid(),
    settlementDate: "2022-05-22",
    parentPomeloTransactionID: null,
    pomeloCardID: pomeloCardID,
    pomeloUserID: pomeloUserID,
    nobaTransactionID: nobaTransactionID,
    amountInUSD: 10,
    localAmount: 500,
    localCurrency: PomeloCurrency.COP,
    settlementAmount: 10,
    settlementCurrency: PomeloCurrency.USD,
    transactionAmount: 500,
    transactionCurrency: PomeloCurrency.COP,
    pomeloTransactionType: PomeloTransactionType.PURCHASE,
    pointType: PomeloPointType.ECOMMERCE,
    entryMode: PomeloEntryMode.CONTACTLESS,
    countryCode: "COL",
    origin: PomeloOrigin.DOMESTIC,
    source: PomeloSource.CLEARING,
    status: PomeloTransactionStatus.PENDING,
    merchantName: "MERCHANT NAME",
    merchantMCC: "MCC",
    createdTimestamp: new Date(),
    updatedTimestamp: new Date(),
  };
};
