import { AggregateRoot } from "../../../core/domain/AggregateRoot";
import { basePropsJoiSchemaKeys } from "../../../core/domain/Entity";
import { KeysRequired } from "../../common/domain/Types";
import Joi from "joi";
import { Entity } from "../../../core/domain/Entity";
import { Verification as VerificationModel } from "@prisma/client";

export class VerificationDataProps implements Partial<VerificationModel> {
  id: string;
  consumerID?: string;
  createdTimestamp?: Date;
  updatedTimestamp?: Date;
}

export const verificationDataValidationKeys: KeysRequired<VerificationDataProps> = {
  ...basePropsJoiSchemaKeys,
  id: Joi.string().min(10).required(),
  consumerID: Joi.string().optional().allow(null),
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
    if (!verificationDataProps.id) verificationDataProps.id = Entity.getNewID();

    return new VerificationData(Joi.attempt(verificationDataProps, verificationDataJoiSchema));
  }
}
