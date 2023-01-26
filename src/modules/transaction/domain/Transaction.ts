import { Transaction as PrismaTransactionModel } from "@prisma/client";
import Joi from "joi";
import { BadRequestError } from "../../../core/exception/CommonAppException";
import { KeysRequired } from "../../../modules/common/domain/Types";

export class Transaction {
  id: string;
  transactionRef: string;
  workflowName: WorkflowName;
  creditConsumerID?: string;
  debitConsumerID?: string;
  debitCurrency?: string;
  creditCurrency?: string;
  debitAmount?: number;
  creditAmount?: number;
  status: TransactionStatus;
  exchangeRate: number;
  memo?: string;
  sessionKey: string;
  createdTimestamp?: Date;
  updatedTimestamp?: Date;
}

// Format - DEBIT_TO_CREDIT
export enum WorkflowName {
  WALLET_DEPOSIT = "WALLET_DEPOSIT",
  WALLET_TRANSFER = "WALLET_TRANSFER",
  WALLET_WITHDRAWAL = "WALLET_WITHDRAWAL",
}

export enum Bank {
  MONO = "MONO",
}

export enum TransactionStatus {
  INITIATED = "INITIATED",
  COMPLETED = "COMPLETED",
  FAILED = "FAILED",
  PROCESSING = "PROCESSING",
  EXPIRED = "EXPIRED",
}

export class InputTransaction {
  transactionRef: string;
  workflowName: WorkflowName;
  creditConsumerID?: string;
  debitConsumerID?: string;
  debitCurrency?: string;
  creditCurrency?: string;
  debitAmount?: number;
  creditAmount?: number;
  exchangeRate: number;
  memo?: string;
  sessionKey: string;
}

export class UpdateTransaction {
  status?: TransactionStatus;
  memo?: string;
  debitAmount?: number;
  creditAmount?: number;
  debitCurrency?: string;
  creditCurrency?: string;
  exchangeRate?: number;
}

export const validateInputTransaction = (transaction: InputTransaction) => {
  const transactionJoiValidationKeys: KeysRequired<InputTransaction> = {
    transactionRef: Joi.string().min(10).required(),
    workflowName: Joi.string()
      .required()
      .valid(...Object.values(WorkflowName)),
    debitConsumerID: Joi.string().min(10).optional(),
    creditConsumerID: Joi.string().min(10).optional(),
    debitAmount: Joi.number().greater(0).optional(),
    creditAmount: Joi.number().greater(0).optional(),
    debitCurrency: Joi.string().optional(),
    creditCurrency: Joi.string().optional(),
    exchangeRate: Joi.number().required(),
    sessionKey: Joi.string().required(),
    memo: Joi.string().optional().allow(null, ""),
  };

  const transactionJoiSchema = Joi.object(transactionJoiValidationKeys).options({
    allowUnknown: false,
    stripUnknown: true,
  });
  Joi.attempt(transaction, transactionJoiSchema);

  const hasDebitSide = transaction.debitAmount && transaction.debitCurrency;
  const hasCreditSide = transaction.creditAmount && transaction.creditCurrency;
  if (!hasDebitSide && !hasCreditSide)
    throw new BadRequestError({ message: "Transaction must have either a debit or credit side." });
};

export const validateSavedTransaction = (transaction: Transaction) => {
  const transactionJoiValidationKeys: KeysRequired<Transaction> = {
    id: Joi.string().min(10).required(),
    transactionRef: Joi.string().required(),
    workflowName: Joi.string()
      .required()
      .valid(...Object.values(WorkflowName)),
    debitConsumerID: Joi.string().min(10).required().allow(null),
    creditConsumerID: Joi.string().min(10).required().allow(null),
    debitAmount: Joi.number().required().allow(null), // null is allowed as either 'debit' or 'credit' side is allowed 'initially'.
    creditAmount: Joi.number().required().allow(null), // null is allowed as either 'debit' or 'credit' side is allowed 'initially'.
    debitCurrency: Joi.string().required().allow(null), // null is allowed as either 'debit' or 'credit' side is allowed 'initially'.
    creditCurrency: Joi.string().required().allow(null), // null is allowed as either 'debit' or 'credit' side is allowed 'initially'.
    status: Joi.string()
      .required()
      .valid(...Object.values(TransactionStatus))
      .default(TransactionStatus.INITIATED),
    exchangeRate: Joi.number().required(),
    sessionKey: Joi.string().required(),
    memo: Joi.string().optional().allow(null),
    createdTimestamp: Joi.date().required(),
    updatedTimestamp: Joi.date().required(),
  };

  const transactionJoiSchema = Joi.object(transactionJoiValidationKeys).options({
    allowUnknown: false,
    stripUnknown: true,
  });

  return Joi.attempt(transaction, transactionJoiSchema);
};

export const validateUpdateTransaction = (transaction: UpdateTransaction) => {
  const transactionJoiValidationKeys: KeysRequired<UpdateTransaction> = {
    debitAmount: Joi.number().optional(),
    creditAmount: Joi.number().optional(),
    debitCurrency: Joi.string().optional(),
    creditCurrency: Joi.string().optional(),
    memo: Joi.string().optional(),
    status: Joi.string()
      .optional()
      .valid(...Object.values(TransactionStatus)),
    exchangeRate: Joi.number().optional(),
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
    debitConsumerID: transaction.debitConsumerID,
    creditConsumerID: transaction.creditConsumerID,
    debitAmount: transaction.debitAmount,
    debitCurrency: transaction.debitCurrency,
    creditAmount: transaction.creditAmount,
    creditCurrency: transaction.creditCurrency,
    status: transaction.status as TransactionStatus,
    exchangeRate: transaction.exchangeRate,
    sessionKey: transaction.sessionKey,
    memo: transaction.memo,
    createdTimestamp: transaction.createdTimestamp,
    updatedTimestamp: transaction.updatedTimestamp,
  };

  return domainTransaction;
};
