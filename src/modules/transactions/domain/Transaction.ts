import { AggregateRoot } from "../../../core/domain/AggregateRoot";
import { Entity, VersioningInfo, versioningInfoJoiSchemaKeys } from "../../../core/domain/Entity";
import { KeysRequired } from "../../common/domain/Types";
import * as Joi from "joi";
import { TransactionStatus } from "./Types";

export interface TransactionProps extends VersioningInfo {
  _id: string;
  userId: string;
  paymentMethodId: string;
  stripePaymentIntentId?: string;
  sourceWalletAddress?: string;
  destinationWalletAddress?: string;
  leg1Amount: number;
  leg2Amount: number;
  leg1: string;
  leg2: string;
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
  paymentMethodId: Joi.string().required(),
  transactionStatus: Joi.string()
    .valid(...Object.values(TransactionStatus))
    .required(),
  leg1Amount: Joi.number().required(),
  leg2Amount: Joi.number().required(),
  leg1: Joi.string().required(),
  leg2: Joi.string().required(),
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
    //set email verified to true when user authenticates via third party and not purely via email
    transactionProps._id = transactionProps._id ?? "transaction_" + Entity.getNewID();
    transactionProps.transactionTimestamp = transactionProps.transactionTimestamp ?? new Date();
    return new Transaction(Joi.attempt(transactionProps, transactionJoiSchema));
  }
}
