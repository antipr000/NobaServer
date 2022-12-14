import { AggregateRoot } from "../../../core/domain/AggregateRoot";
import { Entity, basePropsJoiSchemaKeys } from "../../../core/domain/Entity";
import { KeysRequired } from "../../common/domain/Types";
import { Otp as OTPModel } from "../../../generated/domain/otp";
import Joi from "joi";
import { allIdentities } from "./IdentityType";
import { otpConstants } from "../constants";
import { IdentityType } from "@prisma/client";

export class OTPProps extends OTPModel {}

export const otpValidationKeys: KeysRequired<OTPProps> = {
  ...basePropsJoiSchemaKeys,
  id: Joi.string().min(10).required(),
  emailOrPhone: Joi.string().required(),
  otp: Joi.number().required(),
  otpExpirationTimestamp: Joi.date().required(),
  identityType: Joi.string().valid(...allIdentities),
  consumer: Joi.object().optional().allow(null),
  consumerID: Joi.string().optional().allow(null),
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

  static getIdentityTypeFromString(identityType: string): IdentityType {
    return identityType.toLocaleLowerCase() === IdentityType.CONSUMER.toLocaleLowerCase()
      ? IdentityType.CONSUMER
      : IdentityType.NOBA_ADMIN;
  }
}
