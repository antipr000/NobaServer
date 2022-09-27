import { Schema, model, Model } from "mongoose";
import Mongoose from "mongoose";
import Joigoose from "joigoose";
import { LockProps, lockJoiSchema } from "../../../modules/common/domain/Lock";

const joigoose = Joigoose(Mongoose, null, {});

const mongooseLockSchema = new Schema(joigoose.convert(lockJoiSchema)).index(
  { key: 1, objectType: 1 },
  { unique: true },
);

export const LOCK_MODEL_NAME = "lock";

export const LockModel: Model<LockProps> = model<LockProps>(LOCK_MODEL_NAME, mongooseLockSchema);
