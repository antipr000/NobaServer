import { Schema, model, Model } from "mongoose";
import Mongoose from "mongoose";
import Joigoose from "joigoose";
import {
  limitConfigurationJoiSchema,
  LimitConfigurationProps,
} from "../../../modules/transactions/domain/LimitConfiguration";

const joigoose = Joigoose(Mongoose, null, {});

const mongooseLimitConfigurationSchema = new Schema(joigoose.convert(limitConfigurationJoiSchema), {
  timestamps: {
    createdAt: "createdTimestamp",
    updatedAt: "updatedTimestamp",
  },
  collection: "limitconfigurations",
});

export const LIMIT_CONFIGURATION_MODEL_NAME = "LimitConfiguration";

export const LimitConfigurationModel: Model<LimitConfigurationProps> = model<LimitConfigurationProps>(
  LIMIT_CONFIGURATION_MODEL_NAME,
  mongooseLimitConfigurationSchema,
);
