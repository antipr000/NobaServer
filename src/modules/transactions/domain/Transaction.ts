import * as Joi from "joi";
import { AggregateRoot } from "../../../core/domain/AggregateRoot";
import { Entity, VersioningInfo, versioningInfoJoiSchemaKeys } from "../../../core/domain/Entity";
import { KeysRequired } from "../../common/domain/Types";
import { TransactionStatus, TransactionType } from "./Types";

export const PENDING_TRANSACTION_POLLING_PREFIX = "Poll";

export class TransactionEvent {
  timestamp: string;
  message: string;
}

const transactionEventJoiSchemaKeys: KeysRequired<TransactionEvent> = {
  timestamp: Joi.string().required(),
  message: Joi.string().required(),
};

const transactionEventJoiSchema = Joi.object()
  .keys(transactionEventJoiSchemaKeys)
  .meta({ className: TransactionEvent.name });

export interface TransactionProps extends VersioningInfo {
  _id: string;
  userId: string;
  paymentMethodID: string;
  stripePaymentIntentId?: string;
  checkoutPaymentID?: string;
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

  // this is database specific record we put index on this. it signifies if the transaction needs to be polled for processing or not
  // and if needs to polled then at what time e.g. Poll#2022-10-08T10:00:00 that basically means this item needs to be polled for processing by this time
  dbPollingStatus?: string;
  transactionExceptions?: TransactionEvent[];
}

export const transactionJoiValidationKeys: KeysRequired<TransactionProps> = {
  ...versioningInfoJoiSchemaKeys,
  _id: Joi.string().min(10).required(),
  userId: Joi.string()
    .required()
    .meta({ _mongoose: { index: true, unique: true } }),
  paymentMethodID: Joi.string().optional(), //TODO ankit make it rquired
  transactionStatus: Joi.string()
    // .valid(...Object.values(TransactionStatus)) //TODO Change this
    .required(),
  leg1Amount: Joi.number().required(),
  leg2Amount: Joi.number().required(),
  leg1: Joi.string().required(),
  leg2: Joi.string().required(),
  type: Joi.string()
    .valid(...Object.values(TransactionType))
    .default(TransactionType.ONRAMP),
  diagnosis: Joi.string().optional(),
  sourceWalletAddress: Joi.string().optional(),
  destinationWalletAddress: Joi.string().optional(),
  stripePaymentIntentId: Joi.string().optional(),
  checkoutPaymentID: Joi.string().optional(),
  cryptoTransactionId: Joi.string().optional(),
  transactionTimestamp: Joi.date().optional(),
  dbPollingStatus: Joi.string()
    .optional()
    .meta({ _mongoose: { index: true } }),
  transactionExceptions: Joi.array().items(transactionEventJoiSchema).optional(),
};

export const transactionJoiSchema = Joi.object(transactionJoiValidationKeys).options({ allowUnknown: true });

export class Transaction extends AggregateRoot<TransactionProps> {
  private constructor(transactionProps: TransactionProps) {
    super(transactionProps);
  }

  public static getPollingStatusAttribute(utcIsoTimestamp: string) {
    return `${PENDING_TRANSACTION_POLLING_PREFIX}#${utcIsoTimestamp}`;
  }

  public setDBPollingTimeAfterNSeconds(nSeconds: number) {
    this.props.dbPollingStatus = Transaction.getPollingStatusAttribute(
      new Date(new Date().getTime() + nSeconds * 1000).toISOString(),
    );
  }

  public disableDBPolling() {
    this.props.dbPollingStatus = Transaction.getPollingStatusAttribute(new Date(8640000000000000).toISOString());
  }

  public static createTransaction(transactionProps: Partial<TransactionProps>): Transaction {
    transactionProps._id = transactionProps._id ?? "transaction_" + Entity.getNewID();
    transactionProps.dbPollingStatus == transactionProps.dbPollingStatus ??
      this.getPollingStatusAttribute(new Date().toISOString());
    transactionProps.transactionTimestamp = transactionProps.transactionTimestamp ?? new Date();
    return new Transaction(Joi.attempt(transactionProps, transactionJoiSchema));
  }
}
