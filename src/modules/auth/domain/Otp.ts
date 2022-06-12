import { AggregateRoot } from "../../../core/domain/AggregateRoot";
import { VersioningInfo, versioningInfoJoiSchemaKeys } from "../../../core/domain/Entity";
import { KeysRequired } from "../../common/domain/Types";
import * as Joi from "joi";

export interface OtpProps extends VersioningInfo {
  _id: string;
  otp: number;
  otpExpiryTime: number;
}

export const otpValidationKeys: KeysRequired<OtpProps> = {
  ...versioningInfoJoiSchemaKeys,
  _id: Joi.string().required(),
  otp: Joi.number().required(),
  otpExpiryTime: Joi.number().required(),
};

export const otpJoiSchema = Joi.object(otpValidationKeys).options({ allowUnknown: true });

export class Otp extends AggregateRoot<OtpProps> {
  private constructor(otpProps: OtpProps) {
    super(otpProps);
  }

  public static createOtp(otpProps: OtpProps): Otp {
    return new Otp(Joi.attempt(otpProps, otpJoiSchema));
  }
}
