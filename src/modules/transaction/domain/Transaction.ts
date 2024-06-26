import { Transaction as PrismaTransactionModel, TransactionFee as PrismaTransactionFeeModel } from "@prisma/client";
import Joi from "joi";
import { BadRequestError } from "../../../core/exception/CommonAppException";
import { KeysRequired } from "../../../modules/common/domain/Types";
import {
  FeeType,
  InputTransactionFee,
  TransactionFee,
  convertToDomainTransactionFee,
  inputTransactionFeeJoiValidationKeys,
  transactionFeeJoiValidationKeys,
} from "./TransactionFee";
import { ConsumerWorkflowName, InternalWorkflowName } from "../../../infra/temporal/workflow";
import { ServiceErrorCode, ServiceException } from "../../../core/exception/service.exception";

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
  transactionFees: TransactionFee[];
  createdTimestamp?: Date;
  updatedTimestamp?: Date;
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

export const WorkflowName = { ...ConsumerWorkflowName, ...InternalWorkflowName };
export type WorkflowName = (typeof WorkflowName)[keyof typeof WorkflowName];

export class InputTransaction {
  id?: string;
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
  transactionFees: InputTransactionFee[];
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

export class DebitBankResponse {
  withdrawalID: string;
  state: string;
  declinationReason?: string;
}

export const validateInputTransaction = (transaction: InputTransaction) => {
  const transactionJoiValidationKeys: KeysRequired<InputTransaction> = {
    id: Joi.string().optional(),
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
    transactionFees: Joi.array().items(inputTransactionFeeJoiValidationKeys).required(),
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

  if (transaction.id && transaction.workflowName !== WorkflowName.CARD_WITHDRAWAL) {
    throw new ServiceException({
      errorCode: ServiceErrorCode.UNABLE_TO_PROCESS,
      message: "'id' is expected only for CARD_WITHDRAWAL transactions",
    });
  }
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
    transactionFees: Joi.array().items(transactionFeeJoiValidationKeys).required(),
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

export const convertToDomainTransaction = (
  transaction: PrismaTransactionModel & {
    transactionFees: PrismaTransactionFeeModel[];
  },
): Transaction => {
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
    transactionFees: transaction.transactionFees.map(transactionFee => convertToDomainTransactionFee(transactionFee)),
  };

  return domainTransaction;
};

export const getFee = (transaction: Transaction, feeType: FeeType): TransactionFee => {
  return transaction.transactionFees.find(transactionFee => transactionFee.type === feeType);
};

export const getTotalFees = (transaction: Transaction): number => {
  return transaction.transactionFees.reduce((total, transactionFee) => total + transactionFee.amount, 0);
};
