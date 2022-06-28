import * as Joi from "joi";
import { AggregateRoot } from "../../../core/domain/AggregateRoot";
import { Entity, VersioningInfo, versioningInfoJoiSchemaKeys } from "../../../core/domain/Entity";
import { KeysRequired } from "../../common/domain/Types";
import { TransactionStatus, TransactionType } from "./Types";

export interface TransactionProps extends VersioningInfo {
  _id: string;
  userId: string;
  paymentMethodID: string;
  stripePaymentIntentId?: string;
  sourceWalletAddress?: string;
  destinationWalletAddress?: string;
  leg1Amount: number;
  leg2Amount: number;
  leg1: string;
  leg2: string;
  type: TransactionType;
  diagnosis?: string;
  cryptoTransactionId?: string;
  transactionStatus: TransactionStatus;
  transactionTimestamp?: Date;
}

export const transactionJoiValidationKeys: KeysRequired<TransactionProps> = {
  ...versioningInfoJoiSchemaKeys,
  _id: Joi.string().min(10).required(),
  userId: Joi.string()
    .required()
    .meta({ _mongoose: { index: true } }),
  paymentMethodID: Joi.string().required(),
  transactionStatus: Joi.string()
    .valid(...Object.values(TransactionStatus))
    .required(),
  leg1Amount: Joi.number().required(),
  leg2Amount: Joi.number().required(),
  leg1: Joi.string().required(),
  leg2: Joi.string().required(),
  type: Joi.string()
    .valid(...Object.values(TransactionType))
    .required(),
  diagnosis: Joi.string().optional(),
  sourceWalletAddress: Joi.string().optional(),
  destinationWalletAddress: Joi.string().optional(),
  stripePaymentIntentId: Joi.string().optional(),
  cryptoTransactionId: Joi.string().optional(),
  transactionTimestamp: Joi.date().optional(),
};

export const transactionJoiSchema = Joi.object(transactionJoiValidationKeys).options({ allowUnknown: true });

export class Transaction extends AggregateRoot<TransactionProps> {
  private constructor(transactionProps: TransactionProps) {
    super(transactionProps);
  }

  public static createTransaction(transactionProps: Partial<TransactionProps>): Transaction {
    transactionProps._id = transactionProps._id ?? "transaction_" + Entity.getNewID();
    transactionProps.transactionTimestamp = transactionProps.transactionTimestamp ?? new Date();
    return new Transaction(Joi.attempt(transactionProps, transactionJoiSchema));
  }
}
