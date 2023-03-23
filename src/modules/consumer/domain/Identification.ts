import Joi from "joi";
import { Identification as PrismaIdentificationModel } from "@prisma/client";
import { KeysRequired } from "../../../modules/common/domain/Types";

export class Identification {
  id: string;
  type: string;
  value: string;
  countryCode: string;
  consumerID: string;
  createdTimestamp: Date;
  updatedTimestamp: Date;
}

export class IdentificationCreateRequest {
  type: string;
  value: string;
  countryCode: string;
  consumerID: string;
}

export class IdentificationUpdateRequest {
  value?: string;
  countryCode?: string;
}

export class IdentificationDeleteRequest {
  id: string;
}

export const validateCreateIdentificationRequest = (identification: IdentificationCreateRequest) => {
  const identificationJoiValidationKeys: KeysRequired<IdentificationCreateRequest> = {
    type: Joi.string().required(),
    value: Joi.string().required(),
    consumerID: Joi.string().required(),
    countryCode: Joi.string().required(),
  };

  const identificationJoiSchema = Joi.object(identificationJoiValidationKeys).options({
    allowUnknown: false,
    stripUnknown: true,
  });
  Joi.attempt(identification, identificationJoiSchema);
};

export const validateUpdateIdentificationRequest = (identification: IdentificationUpdateRequest) => {
  const identificationJoiValidationKeys: KeysRequired<IdentificationUpdateRequest> = {
    value: Joi.string().optional(),
    countryCode: Joi.string().optional(),
  };

  const identificationJoiSchema = Joi.object(identificationJoiValidationKeys).options({
    allowUnknown: false,
    stripUnknown: true,
  });
  Joi.attempt(identification, identificationJoiSchema);
};

export const validateDeleteIdentificationRequest = (identification: IdentificationDeleteRequest) => {
  const identificationJoiValidationKeys: KeysRequired<IdentificationDeleteRequest> = {
    id: Joi.string().required(),
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
    countryCode: Joi.string().required(),
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
    countryCode: identification.countryCode,
    consumerID: identification.consumerID,
    createdTimestamp: identification.createdTimestamp,
    updatedTimestamp: identification.updatedTimestamp,
  };
};
