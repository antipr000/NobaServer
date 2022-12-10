import { AggregateRoot } from "../../../core/domain/AggregateRoot";
import { Entity, BaseProps, basePropsJoiSchemaKeys } from "../../../core/domain/Entity";
import { KeysRequired } from "../../common/domain/Types";
import Joi from "joi";
import { allIdentities } from "./IdentityType";
import { otpConstants } from "../constants";

export interface OtpProps extends BaseProps {
  _id: string;
  emailOrPhone: string;
  otp: number;
  otpExpiryTime?: number;
  identityType: string;
  consumerID?: string;
  // any context related to the otp to make sure the latest otp is being used in the same context as it was generated
  // consumer-business-logic of this attribute is free to put any sort of data in this field to make sure they are using the same otp they generated
  otpContext?: any;
}

export const otpValidationKeys: KeysRequired<OtpProps> = {
  ...basePropsJoiSchemaKeys,
  _id: Joi.string().required(),
  emailOrPhone: Joi.string().required(),
  otp: Joi.number().required(),
  otpExpiryTime: Joi.number().required(),
  identityType: Joi.string().valid(...allIdentities),
  consumerID: Joi.string().optional(),
  otpContext: Joi.any().optional(),
};

export const otpJoiSchema = Joi.object(otpValidationKeys).options({ allowUnknown: true });

export class Otp extends AggregateRoot<OtpProps> {
  private constructor(otpProps: OtpProps) {
    super(otpProps);
  }

  public static createOtp(otpProps: Partial<OtpProps>): Otp {
    if (!otpProps._id) otpProps._id = Entity.getNewID();
    if (!otpProps.otpExpiryTime) otpProps.otpExpiryTime = Otp.getOTPExpiryTime().getTime();
    return new Otp(Joi.attempt(otpProps, otpJoiSchema));
  }

  public static getOTPExpiryTime(expiryTimeInMinutes = otpConstants.EXPIRY_TIME_IN_MINUTES): Date {
    return new Date(new Date().getTime() + expiryTimeInMinutes * 60000);
  }
}
