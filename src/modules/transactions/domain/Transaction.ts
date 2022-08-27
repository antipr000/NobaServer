import * as Joi from "joi";
import { AggregateRoot } from "../../../core/domain/AggregateRoot";
import { Entity, VersioningInfo, versioningInfoJoiSchemaKeys } from "../../../core/domain/Entity";
import { KeysRequired } from "../../common/domain/Types";
import { TransactionStatus, TransactionType } from "./Types";

export class TransactionEvent {
  timestamp: Date;
  message: string;
  details: string;
}

const transactionEventJoiSchemaKeys: KeysRequired<TransactionEvent> = {
  timestamp: Joi.date().required(),
  message: Joi.string().required(),
  details: Joi.string().required(),
};

const transactionEventJoiSchema = Joi.object()
  .keys(transactionEventJoiSchemaKeys)
  .meta({ className: TransactionEvent.name });

export interface TransactionProps extends VersioningInfo {
  _id: string;
  userId: string;
  sessionKey: string;
  paymentMethodID: string;
  checkoutPaymentID?: string;
  sourceWalletAddress?: string;
  destinationWalletAddress?: string;
  leg1Amount: number;
  leg2Amount: number;
  leg1: string;
  leg2: string;
  type: TransactionType;
  partnerID: string;
  tradeQuoteID: string;
  nobaTransferTradeID?: string;
  nobaTransferSettlementID?: string;
  nobaFee: number;
  processingFee: number;
  networkFee: number;
  exchangeRate: number;
  diagnosis?: string;
  cryptoTransactionId?: string; // ZH ID
  settledAmount?: number;
  blockchainTransactionId?: string; // Public chain ID
  transactionStatus: TransactionStatus;
  // TODO(#348): Evaluate if this timestamp is required.
  transactionTimestamp?: Date;
  settledTimestamp?: Date;
  zhWithdrawalID: string; // WithdrawalId after transaction is settled.

  // Denotes the timestamp when the status of this tranaction is last updated.
  // The data-type is 'number' instead of 'string' to optimise index space used.
  lastProcessingTimestamp: number;
  lastStatusUpdateTimestamp: number;

  transactionExceptions?: TransactionEvent[];
}

export const transactionJoiValidationKeys: KeysRequired<TransactionProps> = {
  ...versioningInfoJoiSchemaKeys,
  _id: Joi.string().min(10).required(),
  userId: Joi.string()
    .required()
    .meta({ _mongoose: { index: true } }),
  sessionKey: Joi.string().optional(), // TODO(#310) Make it required once we no longer have old txns in the database.
  paymentMethodID: Joi.string().optional(), //TODO ankit make it required
  transactionStatus: Joi.string()
    // .valid(...Object.values(TransactionStatus)) //TODO Change this
    .required(),
  leg1Amount: Joi.number().required(),
  leg2Amount: Joi.number().required(),
  settledAmount: Joi.number().optional(),
  leg1: Joi.string().required(),
  leg2: Joi.string().required(),
  type: Joi.string()
    .valid(...Object.values(TransactionType))
    .default(TransactionType.ONRAMP),
  partnerID: Joi.string().optional(), // TODO(#466) - Make required
  tradeQuoteID: Joi.string().optional(), // Optional as it may get set after initial transaction record is created
  nobaTransferTradeID: Joi.string().optional(),
  nobaTransferSettlementID: Joi.string().optional(),
  nobaFee: Joi.number().optional(),
  processingFee: Joi.number().optional(),
  networkFee: Joi.number().optional(),
  exchangeRate: Joi.number().unsafe().optional(), // TODO(#310) - exchangeRate can have many decimals. Should we round or keep with unsafe()?
  diagnosis: Joi.string().optional(),
  sourceWalletAddress: Joi.string().optional(),
  destinationWalletAddress: Joi.string().optional(),
  checkoutPaymentID: Joi.string().optional(),
  cryptoTransactionId: Joi.string().optional(),
  blockchainTransactionId: Joi.string().optional(),
  transactionTimestamp: Joi.date().optional(),
  settledTimestamp: Joi.date().optional(),
  zhWithdrawalID: Joi.string().optional(),
  lastProcessingTimestamp: Joi.number().optional(),
  lastStatusUpdateTimestamp: Joi.number().optional(),
  transactionExceptions: Joi.array().items(transactionEventJoiSchema).optional(),
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
