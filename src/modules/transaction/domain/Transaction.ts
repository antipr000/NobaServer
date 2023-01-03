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
    debitConsumerID: Joi.string().min(10).optional(),
    creditConsumerID: Joi.string().min(10).optional(),
    debitAmount: Joi.number().greater(0).optional(),
    creditAmount: Joi.number().greater(0).optional(),
    debitCurrency: Joi.string().optional(),
    creditCurrency: Joi.string().optional(),
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
  Joi.attempt(transaction, transactionJoiSchema);

  const hasDebitSide = transaction.debitAmount && transaction.debitCurrency;
  const hasCreditSide = transaction.creditAmount && transaction.creditCurrency;
  if (!hasDebitSide && !hasCreditSide)
    throw new BadRequestError({ message: "Transaction must have either a debit or credit side." });
  if (hasDebitSide && hasCreditSide)
    throw new BadRequestError({ message: "Transaction cannot have both credit & debit side." });
};

export const validateSavedTransaction = (transaction: Transaction) => {
  const transactionJoiValidationKeys: KeysRequired<Transaction> = {
    id: Joi.string().min(10).required(),
    transactionRef: Joi.string().required(),
    workflowName: Joi.string()
      .required()
      .valid(...Object.values(WorkflowName)),
    debitConsumerID: Joi.string().min(10).optional(),
    creditConsumerID: Joi.string().min(10).optional(),
    debitAmount: Joi.number().required().allow(null), // null is allowed as either 'debit' or 'credit' side is allowed 'initially'.
    creditAmount: Joi.number().required().allow(null), // null is allowed as either 'debit' or 'credit' side is allowed 'initially'.
    debitCurrency: Joi.string().required().allow(null), // null is allowed as either 'debit' or 'credit' side is allowed 'initially'.
    creditCurrency: Joi.string().required().allow(null), // null is allowed as either 'debit' or 'credit' side is allowed 'initially'.
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
  const uneditableFields = ["id", "transactionRef", "workflowName", "consumerID", "createdAt", "updatedAt"];
  let containsUneditableFields = false;
  uneditableFields.forEach(field => {
    if (transaction[field]) containsUneditableFields = true;
  });
  if (containsUneditableFields)
    throw new BadRequestError({ message: `${uneditableFields.join(", ")} cannot be updated.` });

  const transactionJoiValidationKeys: KeysRequired<Transaction> = {
    id: Joi.string().min(10).optional(),
    transactionRef: Joi.string().optional(),
    workflowName: Joi.string()
      .optional()
      .valid(...Object.values(WorkflowName)),
    debitConsumerID: Joi.string().min(10).optional(),
    creditConsumerID: Joi.string().min(10).optional(),
    debitAmount: Joi.number().optional(),
    creditAmount: Joi.number().optional(),
    debitCurrency: Joi.string().optional(),
    creditCurrency: Joi.string().optional(),
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
    debitConsumerID: transaction.debitConsumerID,
    creditConsumerID: transaction.creditConsumerID,
    debitAmount: transaction.debitAmount,
    debitCurrency: transaction.debitCurrency,
    creditAmount: transaction.creditAmount,
    creditCurrency: transaction.creditCurrency,
    status: transaction.status as TransactionStatus,
    exchangeRate: transaction.exchangeRate,
    createdTimestamp: transaction.createdTimestamp,
    updatedTimestamp: transaction.updatedTimestamp,
  };

  return domainTransaction;
};
