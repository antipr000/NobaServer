import { Schema, model, Model } from "mongoose";
import * as Mongoose from "mongoose";
import * as Joigoose from "joigoose";
import { AdminProps, adminJoiSchema } from "../../../modules/admin/domain/Admin";

const joigoose = Joigoose(Mongoose, null, {});

const mongooseAdminSchema = new Schema(joigoose.convert(adminJoiSchema));

export const TRANSACTION_MODEL_NAME = "transaction";

export const AdminModel: Model<AdminProps> =
    model<AdminProps>(TRANSACTION_MODEL_NAME, mongooseAdminSchema);