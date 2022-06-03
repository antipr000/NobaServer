//TODO create models fromo Joi Schemas using joigoose? the risk is that if someone changes joischema the db schema changes automatically and previously saved models will break, if we keep the db schema separate from the joi schema 
// the db schema will break at run time if new joischema isn't compatible with old schema? but what if some dev changes the db schema and they aren't aware that it will break old models?
import { Schema, model, Model } from "mongoose";
import * as Mongoose from "mongoose";
import * as Joigoose from "joigoose";
import { partnerAdminSchema, PartnerAdminProps } from "../../../modules/partner/domain/PartnerAdmin";


const joigoose = Joigoose(Mongoose, null , {});



const mongoosePartnerAdminSchema = new Schema(joigoose.convert(partnerAdminSchema));

export const PARTNER_ADMIN_MODEL_NAME = "PartnerAdmin";

export const PartnerAdminModel: Model<PartnerAdminProps> = model<PartnerAdminProps>(PARTNER_ADMIN_MODEL_NAME, mongoosePartnerAdminSchema);
    