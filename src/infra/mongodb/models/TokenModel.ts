import { Schema, model, Model } from "mongoose";
import Mongoose from "mongoose";
import Joigoose from "joigoose";
import { tokenJoiSchema, TokenProps } from "../../../modules/auth/domain/Token";

const joigoose = Joigoose(Mongoose, null, {});

const mongooseTokenSchema = new Schema(joigoose.convert(tokenJoiSchema), {
  timestamps: {
    createdAt: "createdTimestamp",
    updatedAt: "updatedTimestamp",
  },
});

export const TOKEN_MODEL_NAME = "Token";

export const TokenModel: Model<TokenProps> = model<TokenProps>(TOKEN_MODEL_NAME, mongooseTokenSchema);
