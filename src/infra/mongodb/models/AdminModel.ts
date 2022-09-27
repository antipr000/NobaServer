import { Schema, model, Model } from "mongoose";
import Mongoose from "mongoose";
import Joigoose from "joigoose";
import { AdminProps, adminJoiSchema } from "../../../modules/admin/domain/Admin";

const joigoose = Joigoose(Mongoose, null, {});

const mongooseAdminSchema = new Schema(joigoose.convert(adminJoiSchema), {
  timestamps: {
    createdAt: "createdTimestamp",
    updatedAt: "updatedTimestamp",
  },
});

export const TRANSACTION_MODEL_NAME = "admin";

export const AdminModel: Model<AdminProps> = model<AdminProps>(TRANSACTION_MODEL_NAME, mongooseAdminSchema);
