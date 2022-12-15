import { AggregateRoot } from "../../../core/domain/AggregateRoot";
import { Entity, basePropsJoiSchemaKeys } from "../../../core/domain/Entity";
import { KeysRequired } from "../../common/domain/Types";
import Joi from "joi";
import { IdentityType, Otp as OTPModel } from "@prisma/client";

export const otpConstants = {
  EXPIRY_TIME_IN_MINUTES: 15,
};

export class OTPProps implements OTPModel {
  id: string;
  otpIdentifier: string;
  createdTimestamp: Date | null;
  updatedTimestamp: Date | null;
  otp: number;
  otpExpirationTimestamp: Date;
  identityType: IdentityType;
}

export const otpValidationKeys: KeysRequired<OTPProps> = {
  ...basePropsJoiSchemaKeys,
  id: Joi.string().min(10).required(),
  otpIdentifier: Joi.string().required(),
  otp: Joi.number().required(),
  otpExpirationTimestamp: Joi.date().required(),
  identityType: Joi.string().valid().required(),
};

export const otpJoiSchema = Joi.object(otpValidationKeys).options({ allowUnknown: true });

export class OTP extends AggregateRoot<OTPProps> {
  private constructor(otpProps: OTPProps) {
    super(otpProps);
  }

  public static createOtp(otpProps: Partial<OTPProps>): OTP {
    if (!otpProps.id) otpProps.id = Entity.getNewID();
    if (!otpProps.otpExpirationTimestamp) otpProps.otpExpirationTimestamp = OTP.getOTPExpiryTime();
    return new OTP(Joi.attempt(otpProps, otpJoiSchema));
  }

  public static getOTPExpiryTime(expiryTimeInMinutes = otpConstants.EXPIRY_TIME_IN_MINUTES): Date {
    return new Date(new Date().getTime() + expiryTimeInMinutes * 60000);
  }
}
