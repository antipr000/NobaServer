//TODO create models fromo Joi Schemas using joigoose? the risk is that if someone changes joischema the db schema changes automatically and previously saved models will break, if we keep the db schema separate from the joi schema
// the db schema will break at run time if new joischema isn't compatible with old schema? but what if some dev changes the db schema and they aren't aware that it will break old models?
import { Schema, model, Model } from "mongoose";
import * as Mongoose from "mongoose";
import * as Joigoose from "joigoose";
import {
  verificationDataJoiSchema,
  VerificationDataProps,
} from "../../../modules/verification/domain/VerificationData";

const joigoose = Joigoose(Mongoose, null, {});

const mongooseVerificationDataSchema = new Schema(joigoose.convert(verificationDataJoiSchema));

export const VERIFICATION_DATA_MODEL_NAME = "VerificationData";

export const VerificationDataModel: Model<VerificationDataProps> = model<VerificationDataProps>(
  VERIFICATION_DATA_MODEL_NAME,
  mongooseVerificationDataSchema,
);
