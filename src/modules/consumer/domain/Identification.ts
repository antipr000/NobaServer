import { Identification as IdentificationModel } from "@prisma/client";
import Joi from "joi";
import { AggregateRoot } from "../../../core/domain/AggregateRoot";
import { basePropsJoiSchemaKeys } from "../../../core/domain/Entity";
import { KeysRequired } from "../../../modules/common/domain/Types";

export class IdentificationProps implements Partial<IdentificationModel> {
  id: string;
  type: string;
  value: string;
  createdTimestamp?: Date | null;
  updatedTimestamp?: Date | null;
}

export const identificationJoiValidationKeys: KeysRequired<IdentificationProps> = {
  ...basePropsJoiSchemaKeys,
  id: Joi.string().required(),
  type: Joi.string().required(),
  value: Joi.string().required(),
};

export const identificationJoiSchema = Joi.object(identificationJoiValidationKeys).options({
  allowUnknown: true,
  stripUnknown: false,
});

export class Identification extends AggregateRoot<IdentificationProps> {
  constructor(identificationProps: IdentificationProps) {
    super(identificationProps);
  }

  public static createIdentification(identificationProps: Partial<IdentificationProps>): Identification {
    if (!identificationProps.id) identificationProps.id = this.getNewID();
    return new Identification(Joi.attempt(identificationProps, identificationJoiSchema));
  }
}
