import Joi from "joi";
import { Identification as PrismaIdentificationModel } from "@prisma/client";
import { KeysRequired } from "../../../modules/common/domain/Types";

export class Identification {
  id: string;
  type: string;
  value: string;
  consumerID: string;
  createdTimestamp: Date;
  updatedTimestamp: Date;
}

export class IdentificationCreateRequest {
  type: string;
  value: string;
  consumerID: string;
}

export class IdentificationUpdateRequest {
  type: string;
  value: string;
  consumerID: string;
}

export const validateCreateIdentificationRequest = (identification: IdentificationCreateRequest) => {
  const identificationJoiValidationKeys: KeysRequired<IdentificationCreateRequest> = {
    type: Joi.string().required(),
    value: Joi.string().required(),
    consumerID: Joi.string().required(),
  };

  const identificationJoiSchema = Joi.object(identificationJoiValidationKeys).options({
    allowUnknown: false,
    stripUnknown: true,
  });
  Joi.attempt(identification, identificationJoiSchema);
};

export const validateUpdateIdentificationRequest = (identification: IdentificationUpdateRequest) => {
  const identificationJoiValidationKeys: KeysRequired<IdentificationUpdateRequest> = {
    type: Joi.string().required(),
    value: Joi.string().required(),
    consumerID: Joi.string().required(),
  };

  const identificationJoiSchema = Joi.object(identificationJoiValidationKeys).options({
    allowUnknown: false,
    stripUnknown: true,
  });
  Joi.attempt(identification, identificationJoiSchema);
};

export const validateIdentification = (identification: Identification) => {
  const identificationJoiValidationKeys: KeysRequired<Identification> = {
    id: Joi.string().required(),
    type: Joi.string().required(),
    value: Joi.string().required(),
    consumerID: Joi.string().required(),
    createdTimestamp: Joi.date().required(),
    updatedTimestamp: Joi.date().required(),
  };

  const identificationJoiSchema = Joi.object(identificationJoiValidationKeys).options({
    allowUnknown: false,
    stripUnknown: true,
  });
  Joi.attempt(identification, identificationJoiSchema);
};

export const convertToDomainIdentification = (identification: PrismaIdentificationModel): Identification => {
  return {
    id: identification.id,
    type: identification.type,
    value: identification.value,
    consumerID: identification.consumerID,
    createdTimestamp: identification.createdTimestamp,
    updatedTimestamp: identification.updatedTimestamp,
  };
};
