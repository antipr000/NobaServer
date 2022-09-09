import { Schema, model, Model } from "mongoose";
import * as Mongoose from "mongoose";
import * as Joigoose from "joigoose";
import { TransactionProps, transactionJoiSchema } from "../../../modules/transactions/domain/Transaction";

const joigoose = Joigoose(Mongoose, null, {});

const mongooseTransactionSchema = new Schema(joigoose.convert(transactionJoiSchema), {
  timestamps: {
    createdAt: "createdTimestamp",
    updatedAt: "updatedTimestamp",
  },
}).index({ transactionStatus: 1, lastProcessingTimestamp: 1, lastStatusUpdateTimestamp: 1 });

export const TRANSACTION_MODEL_NAME = "transaction";

export const TransactionModel: Model<TransactionProps> = model<TransactionProps>(
  TRANSACTION_MODEL_NAME,
  mongooseTransactionSchema,
);
