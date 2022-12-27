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
  createdAt: Date;
  updatedAt: Date;
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

export const validateInputTransaction = (transaction: Transaction) => {
  const transactionJoiValidationKeys: KeysRequired<Transaction> = {
    id: Joi.string().min(10).required().allow(null), // null is allowed as it is not set when the transaction is created
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
    createdAt: Joi.date().required().allow(null), // null is allowed as it is not set when the transaction is created
    updatedAt: Joi.date().required().allow(null), // null is allowed as it is not set when the transaction is created
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
    createdAt: Joi.date().required(),
    updatedAt: Joi.date().required(),
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
    createdAt: transaction.createdTimestamp,
    updatedAt: transaction.updatedTimestamp,
  };

  return domainTransaction;
};
