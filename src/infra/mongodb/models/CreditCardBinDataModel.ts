import { Schema, model, Model } from "mongoose";
import Mongoose from "mongoose";
import Joigoose from "joigoose";
import { CreditCardBinDataProps, creditCardBinDataJoiSchema } from "../../../modules/common/domain/CreditCardBinData";

const joigoose = Joigoose(Mongoose, null, {});

const mongooseCreditCardBinDataSchema = new Schema(joigoose.convert(creditCardBinDataJoiSchema), {
  timestamps: {
    createdAt: "createdTimestamp",
    updatedAt: "updatedTimestamp",
  },
  collection: "creditcardbindata",
});

export const CREDIT_CARD_BIN_DATA_MODEL_NAME = "CreditCardBINData";

export const CreditCardBinDataModel: Model<CreditCardBinDataProps> = model<CreditCardBinDataProps>(
  CREDIT_CARD_BIN_DATA_MODEL_NAME,
  mongooseCreditCardBinDataSchema,
);
