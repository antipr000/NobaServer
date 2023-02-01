import { TransactionFee as PrismaTransactionFeeModel } from "@prisma/client";
import Joi from "joi";
import { KeysRequired } from "../../../modules/common/domain/Types";

export enum FeeType {
  PROCESSING = "PROCESSING",
  NOBA = "NOBA",
}

export class InputTransactionFee {
  amount: number;
  currency: string;
  type: FeeType;
}

export class TransactionFee extends InputTransactionFee {
  id: string;
  timestamp: Date;
}

export const inputTransactionFeeJoiValidationKeys: KeysRequired<InputTransactionFee> = {
  amount: Joi.number().required(),
  currency: Joi.string().required(),
  type: Joi.string()
    .valid(...Object.values(FeeType))
    .required(),
};

export const transactionFeeJoiValidationKeys: KeysRequired<TransactionFee> = {
  id: Joi.string().required(),
  timestamp: Joi.date().required(),
  amount: Joi.number().required(),
  currency: Joi.string().required(),
  type: Joi.string()
    .valid(...Object.values(FeeType))
    .required(),
};

export const convertToDomainTransactionFee = (transactionFee: PrismaTransactionFeeModel): TransactionFee => {
  const domainTransactionFee: TransactionFee = {
    id: transactionFee.id,
    timestamp: transactionFee.timestamp,
    amount: transactionFee.amount,
    currency: transactionFee.currency,
    type: transactionFee.type as FeeType,
  };

  return domainTransactionFee;
};
