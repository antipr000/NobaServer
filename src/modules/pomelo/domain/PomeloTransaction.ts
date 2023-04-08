import Joi from "joi";
import { PomeloTransaction as PrismaPomeloTransactionModel } from "@prisma/client";
import { KeysRequired } from "../../common/domain/Types";

export class PomeloTransaction {
  id: string;
  pomeloTransactionID: string;
  parentPomeloTransactionID: string;
  pomeloIdempotencyKey: string;
  nobaTransactionID: string;
  pomeloCardID: string;
  amountInUSD: number;
  amountInLocalCurrency: number;
  localCurrency: PomeloCurrency;
  status: PomeloTransactionStatus;
  createdTimestamp: Date;
  updatedTimestamp: Date;
}

export enum PomeloTransactionStatus {
  PENDING = "PENDING",
  APPROVED = "APPROVED",
  INSUFFICIENT_FUNDS = "INSUFFICIENT_FUNDS",
  INVALID_MERCHANT = "INVALID_MERCHANT",
  INVALID_AMOUNT = "INVALID_AMOUNT",
  SYSTEM_ERROR = "SYSTEM_ERROR",
}

export enum PomeloCurrency {
  USD = "USD",
  COP = "COP",
}

export class PomeloTransactionSaveRequest {
  pomeloTransactionID: string;
  parentPomeloTransactionID: string;
  pomeloIdempotencyKey: string;
  nobaTransactionID: string;
  pomeloCardID: string;
  amountInUSD: number;
  amountInLocalCurrency: number;
  localCurrency: PomeloCurrency;
}

export const validateSavePomeloTransactionRequest = (request: PomeloTransactionSaveRequest) => {
  const pomeloTransactionsJoiValidationKeys: KeysRequired<PomeloTransactionSaveRequest> = {
    pomeloTransactionID: Joi.string().required(),
    parentPomeloTransactionID: Joi.string().required().allow(null),
    pomeloIdempotencyKey: Joi.string().required(),
    nobaTransactionID: Joi.string().required(),
    pomeloCardID: Joi.string().required(),
    amountInUSD: Joi.number().required(),
    amountInLocalCurrency: Joi.number().required(),
    localCurrency: Joi.string()
      .required()
      .valid(...Object.values(PomeloCurrency)),
  };
  const pomeloTransactionsJoiSchema = Joi.object(pomeloTransactionsJoiValidationKeys).options({
    allowUnknown: false,
    stripUnknown: true,
  });

  Joi.attempt(request, pomeloTransactionsJoiSchema);
};

export const validatePomeloTransaction = (pomeloTransaction: PomeloTransaction) => {
  const pomeloTransactionsJoiValidationKeys: KeysRequired<PomeloTransaction> = {
    id: Joi.string().required(),
    pomeloTransactionID: Joi.string().required(),
    parentPomeloTransactionID: Joi.string().required().allow(null),
    pomeloIdempotencyKey: Joi.string().required(),
    nobaTransactionID: Joi.string().required(),
    pomeloCardID: Joi.string().required(),
    amountInUSD: Joi.number().required(),
    amountInLocalCurrency: Joi.number().required(),
    localCurrency: Joi.string()
      .required()
      .valid(...Object.values(PomeloCurrency)),
    status: Joi.string()
      .required()
      .valid(...Object.values(PomeloTransactionStatus)),
    createdTimestamp: Joi.date().required(),
    updatedTimestamp: Joi.date().required(),
  };
  const pomeloTransactionsJoiSchema = Joi.object(pomeloTransactionsJoiValidationKeys).options({
    allowUnknown: false,
    stripUnknown: true,
  });

  Joi.attempt(pomeloTransaction, pomeloTransactionsJoiSchema);
};

export const convertToDomainPomeloTransaction = (
  pomeloTransaction: PrismaPomeloTransactionModel,
): PomeloTransaction => {
  return {
    id: pomeloTransaction.id,
    pomeloCardID: pomeloTransaction.pomeloCardID,
    pomeloTransactionID: pomeloTransaction.pomeloTransactionID,
    parentPomeloTransactionID: pomeloTransaction.parentPomeloTransactionID,
    pomeloIdempotencyKey: pomeloTransaction.pomeloIdempotencyKey,
    nobaTransactionID: pomeloTransaction.nobaTransactionID,
    amountInUSD: pomeloTransaction.amountInUSD,
    amountInLocalCurrency: pomeloTransaction.amountInLocalCurrency,
    localCurrency: pomeloTransaction.localCurrency as PomeloCurrency,
    status: pomeloTransaction.status as PomeloTransactionStatus,
    createdTimestamp: pomeloTransaction.createdTimestamp,
    updatedTimestamp: pomeloTransaction.updatedTimestamp,
  };
};
