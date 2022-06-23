import { AggregateRoot } from "../../../core/domain/AggregateRoot";
import { Entity, VersioningInfo, versioningInfoJoiSchemaKeys } from "../../../core/domain/Entity";
import { KeysRequired } from "../../common/domain/Types";
import * as Joi from "joi";
import { allIdentities } from "./IdentityType";

export interface OtpProps extends VersioningInfo {
  _id: string;
  emailOrPhone: string;
  otp: number;
  otpExpiryTime?: number;
  identityType: string;
}

export const otpValidationKeys: KeysRequired<OtpProps> = {
  ...versioningInfoJoiSchemaKeys,
  _id: Joi.string().required(),
  emailOrPhone: Joi.string().required(),
  otp: Joi.number().required(),
  otpExpiryTime: Joi.number().required(),
  identityType: Joi.string().valid(...allIdentities),
};

export const otpJoiSchema = Joi.object(otpValidationKeys).options({ allowUnknown: true });

export class Otp extends AggregateRoot<OtpProps> {
  private constructor(otpProps: OtpProps) {
    super(otpProps);
  }

  public static createOtp(otpProps: Partial<OtpProps>): Otp {
    if (!otpProps._id) otpProps._id = Entity.getNewID();
    return new Otp(Joi.attempt(otpProps, otpJoiSchema));
  }
}
