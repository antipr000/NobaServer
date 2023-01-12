import { Mono as PrismaMonoModel } from "@prisma/client";
import Joi from "joi";
import { KeysRequired } from "../../../modules/common/domain/Types";

export class MonoTransaction {
  id: string;
  monoTransactionID?: string;
  nobaTransactionID: string;
  state: MonoTransactionState;
  collectionLinkID: string;
  collectionURL: string;
  createdTimestamp: Date;
  updatedTimestamp: Date;
}

export enum MonoCurrency {
  COP = "COP",
}

export enum MonoTransactionState {
  PENDING = "PENDING",
  SUCCESS = "SUCCESS",
  EXPIRED = "EXPIRED",
}

export class MonoTransactionCreateRequest {
  nobaTransactionID: string;
  collectionLinkID: string;
  collectionURL: string;
}

export class MonoTransactionUpdateRequest {
  monoTransactionID?: string;
  state?: MonoTransactionState;
}

export const validateCreateMonoTransactionRequest = (transaction: MonoTransactionCreateRequest) => {
  const transactionJoiValidationKeys: KeysRequired<MonoTransactionCreateRequest> = {
    collectionLinkID: Joi.string().required(),
    collectionURL: Joi.string().required(),
    nobaTransactionID: Joi.string().required(),
  };

  const transactionJoiSchema = Joi.object(transactionJoiValidationKeys).options({
    allowUnknown: false,
    stripUnknown: true,
  });
  Joi.attempt(transaction, transactionJoiSchema);
};

export const validateUpdateMonoTransactionRequest = (transaction: MonoTransactionUpdateRequest) => {
  const transactionJoiValidationKeys: KeysRequired<MonoTransactionUpdateRequest> = {
    monoTransactionID: Joi.string().optional(),
    state: Joi.string()
      .optional()
      .valid(...Object.values(MonoTransactionState)),
  };

  const transactionJoiSchema = Joi.object(transactionJoiValidationKeys).options({
    allowUnknown: false,
    stripUnknown: true,
  });
  Joi.attempt(transaction, transactionJoiSchema);
};

export const validateMonoTransaction = (transaction: MonoTransaction) => {
  const transactionJoiValidationKeys: KeysRequired<MonoTransaction> = {
    id: Joi.string().required(),
    collectionLinkID: Joi.string().required(),
    collectionURL: Joi.string().required(),
    nobaTransactionID: Joi.string().required(),
    monoTransactionID: Joi.string().required().allow(null),
    state: Joi.string()
      .required()
      .valid(...Object.values(MonoTransactionState)),
    createdTimestamp: Joi.date().required(),
    updatedTimestamp: Joi.date().required(),
  };

  const transactionJoiSchema = Joi.object(transactionJoiValidationKeys).options({
    allowUnknown: false,
    stripUnknown: true,
  });
  Joi.attempt(transaction, transactionJoiSchema);
};

export const convertToDomainTransaction = (transaction: PrismaMonoModel): MonoTransaction => {
  return {
    id: transaction.id,
    collectionLinkID: transaction.collectionLinkID,
    collectionURL: transaction.collectionUrl,
    nobaTransactionID: transaction.nobaTransactionID,
    monoTransactionID: transaction.monoTransactionID,
    state: transaction.state as MonoTransactionState,
    createdTimestamp: transaction.createdTimestamp,
    updatedTimestamp: transaction.updatedTimestamp,
  };
};
