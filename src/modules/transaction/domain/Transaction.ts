import { Transaction as PrismaTransactionModel } from "@prisma/client";
import Joi from "joi";
import { KeysRequired } from "../../../modules/common/domain/Types";

export class Transaction {
  id: string;
  transactionRef: string;
  workflowName: WorkflowName;
  consumerID: string;
  amount: number;
  currency: string;
  status: TransactionStatus;
  exchangeRate: number;
  createdTimestamp: Date;
  updatedTimestamp: Date;
}

// Format - DEBIT_TO_CREDIT
export enum WorkflowName {
  BANK_TO_NOBA_WALLET = "BANK_TO_NOBA_WALLET",
  NOBA_WALLET_TO_BANK = "NOBA_WALLET_TO_BANK",
}

export enum TransactionStatus {
  PENDING = "PENDING",
  SUCCESS = "SUCCESS",
  FAILED = "FAILED",
  IN_PROGRESS = "IN_PROGRESS",
}

export const validateInputTransaction = (transaction: Partial<Transaction>) => {
  const transactionJoiValidationKeys: KeysRequired<Transaction> = {
    id: Joi.string().min(10).optional().allow(null), // null is allowed as it is not set when the transaction is created
    transactionRef: Joi.string().min(10).required(),
    workflowName: Joi.string()
      .required()
      .valid(...Object.values(WorkflowName)),
    consumerID: Joi.string().min(10).required(),
    amount: Joi.number().required(),
    currency: Joi.string().required(),
    status: Joi.string()
      .optional()
      .valid(...Object.values(TransactionStatus))
      .default(TransactionStatus.PENDING),
    exchangeRate: Joi.number().required(),
    createdTimestamp: Joi.date().required().allow(null), // null is allowed as it is not set when the transaction is created
    updatedTimestamp: Joi.date().required().allow(null), // null is allowed as it is not set when the transaction is created
  };

  const transactionJoiSchema = Joi.object(transactionJoiValidationKeys).options({
    allowUnknown: false,
    stripUnknown: true,
  });

  return Joi.attempt(transaction, transactionJoiSchema);
};

export const validateSavedTransaction = (transaction: Transaction) => {
  const transactionJoiValidationKeys: KeysRequired<Transaction> = {
    id: Joi.string().min(10).required(),
    transactionRef: Joi.string().required(),
    workflowName: Joi.string()
      .required()
      .valid(...Object.values(WorkflowName)),
    consumerID: Joi.string().min(10).required(),
    amount: Joi.number().required(),
    currency: Joi.string().required(),
    status: Joi.string()
      .required()
      .valid(...Object.values(TransactionStatus))
      .default(TransactionStatus.PENDING),
    exchangeRate: Joi.number().required(),
    createdTimestamp: Joi.date().required(),
    updatedTimestamp: Joi.date().required(),
  };

  const transactionJoiSchema = Joi.object(transactionJoiValidationKeys).options({
    allowUnknown: false,
    stripUnknown: true,
  });

  return Joi.attempt(transaction, transactionJoiSchema);
};

export const validateUpdateTransaction = (transaction: Partial<Transaction>) => {
  const uneditableFields = [
    "id",
    "transactionRef",
    "workflowName",
    "consumerID",
    "amount",
    "currency",
    "createdAt",
    "updatedAt",
  ];
  let containsUneditableFields = false;
  uneditableFields.forEach(field => {
    if (transaction[field]) containsUneditableFields = true;
  });
  if (containsUneditableFields) throw new Error(`${uneditableFields.join(", ")} cannot be updated.`);

  const transactionJoiValidationKeys: KeysRequired<Transaction> = {
    id: Joi.string().min(10).optional(),
    transactionRef: Joi.string().optional(),
    workflowName: Joi.string()
      .optional()
      .valid(...Object.values(WorkflowName)),
    consumerID: Joi.string().min(10).optional(),
    amount: Joi.number().optional(),
    currency: Joi.string().optional(),
    status: Joi.string()
      .optional()
      .valid(...Object.values(TransactionStatus))
      .default(TransactionStatus.PENDING),
    exchangeRate: Joi.number().optional(),
    createdTimestamp: Joi.date().optional(),
    updatedTimestamp: Joi.date().optional(),
  };
  const transactionJoiSchema = Joi.object(transactionJoiValidationKeys).options({
    allowUnknown: false,
    stripUnknown: true,
  });

  return Joi.attempt(transaction, transactionJoiSchema);
};

export const convertToDomainTransaction = (transaction: PrismaTransactionModel): Transaction => {
  const domainTransaction: Transaction = {
    id: transaction.id,
    transactionRef: transaction.transactionRef,
    workflowName: transaction.workflowName as WorkflowName,
    consumerID: transaction.consumerID,
    amount: transaction.amount,
    currency: transaction.currency,
    status: transaction.status as TransactionStatus,
    exchangeRate: transaction.exchangeRate,
    createdTimestamp: transaction.createdTimestamp,
    updatedTimestamp: transaction.updatedTimestamp,
  };

  return domainTransaction;
};
