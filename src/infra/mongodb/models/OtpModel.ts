import { Schema, model, Model } from "mongoose";
import * as Mongoose from "mongoose";
import * as Joigoose from "joigoose";
import { OtpProps, otpJoiSchema } from "../../../modules/auth/domain/Otp";

const joigoose = Joigoose(Mongoose, null, {});

const mongooseOtpSchema = new Schema(joigoose.convert(otpJoiSchema), {
  timestamps: {
    createdAt: "createdTimestamp",
    updatedAt: "updatedTimestamp",
  },
});

export const OTP_MODEL_NAME = "otp";

export const OtpModel: Model<OtpProps> = model<OtpProps>(OTP_MODEL_NAME, mongooseOtpSchema);
