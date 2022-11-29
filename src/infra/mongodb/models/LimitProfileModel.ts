import { Schema, model, Model } from "mongoose";
import Mongoose from "mongoose";
import Joigoose from "joigoose";
import { limitProfileJoiSchema, LimitProfileProps } from "../../../modules/transactions/domain/LimitProfile";

const joigoose = Joigoose(Mongoose, null, {});

const mongooseLimitProfileSchema = new Schema(joigoose.convert(limitProfileJoiSchema), {
  timestamps: {
    createdAt: "createdTimestamp",
    updatedAt: "updatedTimestamp",
  },
  collection: "limitprofiles",
});

export const LIMIT_PROFILE_MODEL_NAME = "LimitProfile";

export const LimitProfileModel: Model<LimitProfileProps> = model<LimitProfileProps>(
  LIMIT_PROFILE_MODEL_NAME,
  mongooseLimitProfileSchema,
);
