import { Mono as PrismaMonoModel } from "@prisma/client";
import Joi from "joi";
import { ServiceErrorCode, ServiceException } from "../../../core/exception/ServiceException";
import { KeysRequired } from "../../../modules/common/domain/Types";

export class MonoTransaction {
  id: string;
  nobaTransactionID: string;
  type: MonoTransactionType;
  state: MonoTransactionState;

  collectionLinkDepositDetails?: MonoCollectionLinkDeposits;
  withdrawalDetails?: MonoWithdrawals;

  createdTimestamp: Date;
  updatedTimestamp: Date;
  monoTransactionID?: string; // [DEPRECATED] use monoPaymentTransactionID instead
}

export class MonoCollectionLinkDeposits {
  collectionLinkID: string;
  collectionURL: string;
  monoPaymentTransactionID?: string;
}

export class MonoWithdrawals {
  transferID: string;
  batchID: string;
  declinationReason?: string;
}

// [DEPRECATED] use MonoWithdrawals instead
export class MonoWithdrawal {
  withdrawalID: string;
  state: string;
  declinationReason?: string;
}

export enum MonoCurrency {
  COP = "COP",
}

export enum MonoTransactionState {
  PENDING = "PENDING",
  IN_PROGRESS = "IN_PROGRESS",
  SUCCESS = "SUCCESS",
  EXPIRED = "EXPIRED",
  DECLINED = "DECLINED",
  CANCELLED = "CANCELLED",
  DUPLICATED = "DUPLICATED",
}

export const isTerminalState = (state: MonoTransactionState): boolean => {
  return [
    MonoTransactionState.SUCCESS,
    MonoTransactionState.EXPIRED,
    MonoTransactionState.DECLINED,
    MonoTransactionState.CANCELLED,
    MonoTransactionState.DUPLICATED,
  ].includes(state);
};

export enum MonoTransactionType {
  COLLECTION_LINK_DEPOSIT = "COLLECTION_LINK_DEPOSIT",
  WITHDRAWAL = "WITHDRAWAL",
}

export class MonoTransactionSaveRequest {
  nobaTransactionID: string;
  type: MonoTransactionType;
  collectionLinkDepositDetails?: MonoCollectionLinkDeposits;
  withdrawalDetails?: MonoWithdrawals;
}

export class MonoTransactionUpdateRequest {
  monoPaymentTransactionID?: string;
  state?: MonoTransactionState;
  declinationReason?: string;
}

export const validateSaveMonoTransactionRequest = (transaction: MonoTransactionSaveRequest) => {
  const collectionLinkDepositsValidationKeys: KeysRequired<MonoCollectionLinkDeposits> = {
    collectionLinkID: Joi.string().required(),
    collectionURL: Joi.string().required(),
    monoPaymentTransactionID: Joi.string().optional(),
  };
  const withdrawalDetailsValidationKeys: KeysRequired<MonoWithdrawals> = {
    transferID: Joi.string().required(),
    batchID: Joi.string().required(),
    declinationReason: Joi.string().optional(),
  };

  const transactionJoiValidationKeys: KeysRequired<MonoTransactionSaveRequest> = {
    nobaTransactionID: Joi.string().required(),
    type: Joi.string().valid(MonoTransactionType.COLLECTION_LINK_DEPOSIT, MonoTransactionType.WITHDRAWAL).required(),
    collectionLinkDepositDetails: Joi.object(collectionLinkDepositsValidationKeys).optional(),
    withdrawalDetails: Joi.object(withdrawalDetailsValidationKeys).optional(),
  };

  const transactionJoiSchema = Joi.object(transactionJoiValidationKeys).options({
    allowUnknown: false,
    stripUnknown: true,
  });
  Joi.attempt(transaction, transactionJoiSchema);

  if (!transaction.collectionLinkDepositDetails && !transaction.withdrawalDetails) {
    throw new ServiceException({
      message: "Either collectionLinkDepositDetails or withdrawalDetails must be provided",
      errorCode: ServiceErrorCode.UNABLE_TO_PROCESS,
    });
  }
};

export const validateUpdateMonoTransactionRequest = (transaction: MonoTransactionUpdateRequest) => {
  const transactionJoiValidationKeys: KeysRequired<MonoTransactionUpdateRequest> = {
    monoPaymentTransactionID: Joi.string().optional(),
    state: Joi.string()
      .optional()
      .valid(...Object.values(MonoTransactionState)),
    declinationReason: Joi.string().optional(),
  };

  const transactionJoiSchema = Joi.object(transactionJoiValidationKeys).options({
    allowUnknown: false,
    stripUnknown: true,
  });
  Joi.attempt(transaction, transactionJoiSchema);
};

export const validateMonoTransaction = (transaction: MonoTransaction) => {
  const collectionLinkDepositsValidationKeys: KeysRequired<MonoCollectionLinkDeposits> = {
    collectionLinkID: Joi.string().required(),
    collectionURL: Joi.string().required(),
    monoPaymentTransactionID: Joi.string().optional(),
  };
  const withdrawalDetailsValidationKeys: KeysRequired<MonoWithdrawals> = {
    transferID: Joi.string().required(),
    batchID: Joi.string().required(),
    declinationReason: Joi.string().optional(),
  };

  const transactionJoiValidationKeys: KeysRequired<MonoTransaction> = {
    id: Joi.string().required(),
    nobaTransactionID: Joi.string().required(),
    type: Joi.string().valid(MonoTransactionType.COLLECTION_LINK_DEPOSIT, MonoTransactionType.WITHDRAWAL).required(),
    state: Joi.string()
      .required()
      .valid(...Object.values(MonoTransactionState)),
    collectionLinkDepositDetails: Joi.object(collectionLinkDepositsValidationKeys).optional(),
    withdrawalDetails: Joi.object(withdrawalDetailsValidationKeys).optional(),
    createdTimestamp: Joi.date().required(),
    updatedTimestamp: Joi.date().required(),
    monoTransactionID: Joi.string().optional(), // [DEPRECATED]
  };

  const transactionJoiSchema = Joi.object(transactionJoiValidationKeys).options({
    allowUnknown: false,
    stripUnknown: true,
  });
  Joi.attempt(transaction, transactionJoiSchema);
};

export const convertToDomainTransaction = (transaction: PrismaMonoModel): MonoTransaction => {
  const result: MonoTransaction = {
    id: transaction.id,
    nobaTransactionID: transaction.nobaTransactionID,
    state: transaction.state as MonoTransactionState,
    type: transaction.type as MonoTransactionType,
    createdTimestamp: transaction.createdTimestamp,
    updatedTimestamp: transaction.updatedTimestamp,
  };

  switch (transaction.type) {
    case MonoTransactionType.COLLECTION_LINK_DEPOSIT:
      result.collectionLinkDepositDetails = {
        collectionLinkID: transaction.collectionLinkID,
        collectionURL: transaction.collectionURL,
        ...(transaction.monoPaymentTransactionID && { monoPaymentTransactionID: transaction.monoPaymentTransactionID }),
      };
      break;

    case MonoTransactionType.WITHDRAWAL:
      result.withdrawalDetails = {
        transferID: transaction.transferID,
        batchID: transaction.batchID,
        ...(transaction.declinationReason && { declinationReason: transaction.declinationReason }),
      };
      break;
  }

  return result;
};
