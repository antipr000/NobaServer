import { Schema, model, Model } from "mongoose";
import Mongoose from "mongoose";
import Joigoose from "joigoose";
import { OTPProps, otpJoiSchema } from "../../../modules/auth/domain/OTP";

const joigoose = Joigoose(Mongoose, null, {});

const mongooseOtpSchema = new Schema(joigoose.convert(otpJoiSchema), {
  timestamps: {
    createdAt: "createdTimestamp",
    updatedAt: "updatedTimestamp",
  },
});

export const OTP_MODEL_NAME = "otp";

export const OtpModel: Model<OTPProps> = model<OTPProps>(OTP_MODEL_NAME, mongooseOtpSchema);
