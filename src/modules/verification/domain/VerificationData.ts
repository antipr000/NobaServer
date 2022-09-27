import { AggregateRoot } from "../../../core/domain/AggregateRoot";
import { VersioningInfo, versioningInfoJoiSchemaKeys } from "../../../core/domain/Entity";
import { KeysRequired } from "../../common/domain/Types";
import Joi from "joi";
import { Entity } from "../../../core/domain/Entity";

export interface VerificationDataProps extends VersioningInfo {
  _id: string;
  userID?: string;
  transactionID?: string;
}

export const verificationDataValidationKeys: KeysRequired<VerificationDataProps> = {
  ...versioningInfoJoiSchemaKeys,
  _id: Joi.string().min(10).required(),
  userID: Joi.string().optional(),
  transactionID: Joi.string().optional(),
};

export const verificationDataJoiSchema = Joi.object(verificationDataValidationKeys).options({
  allowUnknown: true,
  stripUnknown: false,
});

export class VerificationData extends AggregateRoot<VerificationDataProps> {
  private constructor(verificationDataProps: VerificationDataProps) {
    super(verificationDataProps);
  }

  public static createVerificationData(verificationDataProps: Partial<VerificationDataProps>): VerificationData {
    //set email verified to true when user authenticates via third party and not purely via email
    if (!verificationDataProps._id) verificationDataProps._id = Entity.getNewID();

    return new VerificationData(Joi.attempt(verificationDataProps, verificationDataJoiSchema));
  }
}
