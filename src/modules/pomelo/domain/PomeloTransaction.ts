import Joi from "joi";
import { PomeloTransaction as PrismaPomeloTransactionModel } from "@prisma/client";
import { KeysRequired } from "../../common/domain/Types";

export class PomeloTransaction {
  id: string;
  pomeloTransactionID: string;
  parentPomeloTransactionID: string;
  pomeloIdempotencyKey: string;
  nobaTransactionID: string;
  settlementDate: string;
  pomeloCardID: string;
  pomeloUserID: string;
  amountInUSD: number;
  localAmount: number;
  localCurrency: PomeloCurrency;
  settlementAmount: number;
  settlementCurrency: PomeloCurrency;
  transactionAmount: number;
  transactionCurrency: PomeloCurrency;
  status: PomeloTransactionStatus;
  pomeloTransactionType: PomeloTransactionType;
  pointType: PomeloPointType;
  entryMode: PomeloEntryMode;
  countryCode: string;
  origin: PomeloOrigin;
  source: PomeloSource;
  merchantName: string;
  merchantMCC: string;
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

export enum PomeloTransactionType {
  PURCHASE = "PURCHASE",
  WITHDRAWAL = "WITHDRAWAL",
  EXTRACASH = "EXTRACASH",
  BALANCE_INQUIRY = "BALANCE_INQUIRY",

  REFUND = "REFUND",
  PAYMENT = "PAYMENT",
  REVERSAL_PURCHASE = "REVERSAL_PURCHASE",
  REVERSAL_WITHDRAWAL = "REVERSAL_WITHDRAWAL",
  REVERSAL_EXTRACASH = "REVERSAL_EXTRACASH",

  REVERSAL_REFUND = "REVERSAL_REFUND",
  REVERSAL_PAYMENT = "REVERSAL_PAYMENT",
}

export enum PomeloPointType {
  POS = "POS",
  ECOMMERCE = "ECOMMERCE",
  ATM = "ATM",
  MOTO = "MOTO",
}

export enum PomeloEntryMode {
  MANUAL = "MANUAL",
  CHIP = "CHIP",
  CONTACTLESS = "CONTACTLESS",
  CREDENTIAL_ON_FILE = "CREDENTIAL_ON_FILE",
  MAG_STRIPE = "MAG_STRIPE",
  OTHER = "OTHER",
  UNKNOWN = "UNKNOWN",
}

export enum PomeloOrigin {
  DOMESTIC = "DOMESTIC",
  INTERNATIONAL = "INTERNATIONAL",
}

export enum PomeloSource {
  ONLINE = "ONLINE",
  CLEARING = "CLEARING",
  PURGE = "PURGE",
  MANUAL = "MANUAL",
  CHARGEBACK_MANUAL = "CHARGEBACK_MANUAL",
  TRUST_CREDIT_MANUAL = "TRUST_CREDIT_MANUAL",
}

export class PomeloTransactionSaveRequest {
  pomeloTransactionID: string;
  settlementDate: string;
  parentPomeloTransactionID: string;
  pomeloIdempotencyKey: string;
  nobaTransactionID: string;
  pomeloCardID: string;
  pomeloUserID: string;
  amountInUSD: number;
  localAmount: number;
  localCurrency: PomeloCurrency;
  settlementAmount: number;
  settlementCurrency: PomeloCurrency;
  transactionAmount: number;
  transactionCurrency: PomeloCurrency;
  pomeloTransactionType: PomeloTransactionType;
  pointType: PomeloPointType;
  entryMode: PomeloEntryMode;
  countryCode: string;
  origin: PomeloOrigin;
  source: PomeloSource;
  merchantName: string;
  merchantMCC: string;
}

export const validateSavePomeloTransactionRequest = (request: PomeloTransactionSaveRequest) => {
  const pomeloTransactionsJoiValidationKeys: KeysRequired<PomeloTransactionSaveRequest> = {
    pomeloTransactionID: Joi.string().required(),
    settlementDate: Joi.string().required(),
    parentPomeloTransactionID: Joi.string().required().allow(null),
    pomeloIdempotencyKey: Joi.string().required(),
    nobaTransactionID: Joi.string().required(),
    pomeloCardID: Joi.string().required(),
    pomeloUserID: Joi.string().required(),
    amountInUSD: Joi.number().required(),
    localAmount: Joi.number().required(),
    localCurrency: Joi.string()
      .required()
      .valid(...Object.values(PomeloCurrency)),
    settlementAmount: Joi.number().required(),
    settlementCurrency: Joi.string()
      .required()
      .valid(...Object.values(PomeloCurrency)),
    transactionAmount: Joi.number().required(),
    transactionCurrency: Joi.string()
      .required()
      .valid(...Object.values(PomeloCurrency)),
    pomeloTransactionType: Joi.string()
      .required()
      .valid(...Object.values(PomeloTransactionType)),
    pointType: Joi.string()
      .required()
      .valid(...Object.values(PomeloPointType)),
    entryMode: Joi.string()
      .required()
      .valid(...Object.values(PomeloEntryMode)),
    countryCode: Joi.string().required(),
    origin: Joi.string()
      .required()
      .valid(...Object.values(PomeloOrigin)),
    source: Joi.string()
      .required()
      .valid(...Object.values(PomeloSource)),
    merchantName: Joi.string().required(),
    merchantMCC: Joi.string().required(),
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
    settlementDate: Joi.string().required(),
    pomeloIdempotencyKey: Joi.string().required(),
    nobaTransactionID: Joi.string().required(),
    pomeloCardID: Joi.string().required(),
    pomeloUserID: Joi.string().required(),
    amountInUSD: Joi.number().required(),
    localAmount: Joi.number().required(),
    localCurrency: Joi.string()
      .required()
      .valid(...Object.values(PomeloCurrency)),
    settlementAmount: Joi.number().required(),
    settlementCurrency: Joi.string()
      .required()
      .valid(...Object.values(PomeloCurrency)),
    transactionAmount: Joi.number().required(),
    transactionCurrency: Joi.string()
      .required()
      .valid(...Object.values(PomeloCurrency)),
    status: Joi.string()
      .required()
      .valid(...Object.values(PomeloTransactionStatus)),
    pomeloTransactionType: Joi.string()
      .required()
      .valid(...Object.values(PomeloTransactionType)),
    pointType: Joi.string()
      .required()
      .valid(...Object.values(PomeloPointType)),
    entryMode: Joi.string()
      .required()
      .valid(...Object.values(PomeloEntryMode)),
    countryCode: Joi.string().required(),
    origin: Joi.string()
      .required()
      .valid(...Object.values(PomeloOrigin)),
    source: Joi.string()
      .required()
      .valid(...Object.values(PomeloSource)),
    merchantName: Joi.string().required(),
    merchantMCC: Joi.string().required(),
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
    pomeloUserID: pomeloTransaction.pomeloUserID,
    pomeloTransactionID: pomeloTransaction.pomeloTransactionID,
    parentPomeloTransactionID: pomeloTransaction.parentPomeloTransactionID,
    settlementDate: pomeloTransaction.settlementDate,
    pomeloIdempotencyKey: pomeloTransaction.pomeloIdempotencyKey,
    nobaTransactionID: pomeloTransaction.nobaTransactionID,
    amountInUSD: pomeloTransaction.amountInUSD,
    localAmount: pomeloTransaction.localAmount,
    localCurrency: pomeloTransaction.localCurrency as PomeloCurrency,
    settlementAmount: pomeloTransaction.settlementAmount,
    settlementCurrency: pomeloTransaction.settlementCurrency as PomeloCurrency,
    transactionAmount: pomeloTransaction.transactionAmount,
    transactionCurrency: pomeloTransaction.transactionCurrency as PomeloCurrency,
    pomeloTransactionType: pomeloTransaction.pomeloTransactionType as PomeloTransactionType,
    pointType: pomeloTransaction.pointType as PomeloPointType,
    entryMode: pomeloTransaction.entryMode as PomeloEntryMode,
    countryCode: pomeloTransaction.countryCode,
    origin: pomeloTransaction.origin as PomeloOrigin,
    source: pomeloTransaction.source as PomeloSource,
    status: pomeloTransaction.status as PomeloTransactionStatus,
    merchantName: pomeloTransaction.merchantName,
    merchantMCC: pomeloTransaction.merchantMCC,
    createdTimestamp: pomeloTransaction.createdTimestamp,
    updatedTimestamp: pomeloTransaction.updatedTimestamp,
  };
};
