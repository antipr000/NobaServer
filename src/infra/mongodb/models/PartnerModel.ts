//TODO create models fromo Joi Schemas using joigoose? the risk is that if someone changes joischema the db schema changes automatically and previously saved models will break, if we keep the db schema separate from the joi schema
// the db schema will break at run time if new joischema isn't compatible with old schema? but what if some dev changes the db schema and they aren't aware that it will break old models?
import { Schema, model, Model } from "mongoose";
import * as Mongoose from "mongoose";
import * as Joigoose from "joigoose";
import { partnerSchema, PartnerProps } from "../../../modules/partner/domain/Partner";

const joigoose = Joigoose(Mongoose, null, {});

const mongoosePartnerSchema = new Schema(joigoose.convert(partnerSchema));

export const PARTNER_MODEL_NAME = "Partner";

export const PartnerModel: Model<PartnerProps> = model<PartnerProps>(PARTNER_MODEL_NAME, mongoosePartnerSchema);
