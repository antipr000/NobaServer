import Joi from "joi";
import { KeysRequired } from "../../../../modules/common/domain/Types";
import { PomeloCard as PrismaPomeloCardModel } from "@prisma/client";

export enum PomeloCardType {
  PHYSICAL = "PHYSICAL",
  VIRTUAL = "VIRTUAL",
}

export enum PomeloCardStatus {
  BLOCKED = "BLOCKED",
  DISABLED = "DISABLED",
  ACTIVE = "ACTIVE",
}

export class PomeloCard {
  id: string;
  status: PomeloCardStatus;
  pomeloID: string;
  nobaConsumerID: string;
  type: PomeloCardType;
  createdTimestamp: Date;
  updatedTimestamp: Date;
}

export class PomeloCardSaveRequest {
  pomeloCardID: string;
  nobaConsumerID: string;
  status: PomeloCardStatus;
  type: PomeloCardType;
}

export class PomeloCardUpdateRequest {
  nobaConsumerID: string;
  pomeloCardID: string;
  status: PomeloCardStatus;
}

export const validateSavePomeloCardRequest = (request: PomeloCardSaveRequest) => {
  const pomeloCardJoiValidationKeys: KeysRequired<PomeloCardSaveRequest> = {
    pomeloCardID: Joi.string().required(),
    nobaConsumerID: Joi.string().required(),
    status: Joi.string()
      .required()
      .valid(...Object.values(PomeloCardStatus)),
    type: Joi.string()
      .required()
      .valid(...Object.values(PomeloCardType)),
  };
  const pomeloCardJoiSchema = Joi.object(pomeloCardJoiValidationKeys).options({
    allowUnknown: false,
    stripUnknown: true,
  });

  Joi.attempt(request, pomeloCardJoiSchema);
};

export const validateUpdatePomeloCardRequest = (request: PomeloCardUpdateRequest) => {
  const pomeloCardJoiValidationKeys: KeysRequired<PomeloCardUpdateRequest> = {
    pomeloCardID: Joi.string().required(),
    nobaConsumerID: Joi.string().required(),
    status: Joi.string()
      .required()
      .valid(...Object.values(PomeloCardStatus)),
  };
  const pomeloCardJoiSchema = Joi.object(pomeloCardJoiValidationKeys).options({
    allowUnknown: false,
    stripUnknown: true,
  });

  Joi.attempt(request, pomeloCardJoiSchema);
};

export const validatePomeloCard = (pomeloCard: PomeloCard) => {
  const pomeloCardJoiValidationKeys: KeysRequired<PomeloCard> = {
    pomeloID: Joi.string().required(),
    nobaConsumerID: Joi.string().required(),
    status: Joi.string()
      .required()
      .valid(...Object.values(PomeloCardStatus)),
    type: Joi.string()
      .required()
      .valid(...Object.values(PomeloCardType)),
    id: Joi.string().required(),
    createdTimestamp: Joi.date().required(),
    updatedTimestamp: Joi.date().required(),
  };
  const pomeloCardJoiSchema = Joi.object(pomeloCardJoiValidationKeys).options({
    allowUnknown: false,
    stripUnknown: true,
  });

  Joi.attempt(pomeloCard, pomeloCardJoiSchema);
};

export const convertToDomainPomeloCard = (pomeloCard: PrismaPomeloCardModel): PomeloCard => {
  return {
    id: pomeloCard.id,
    pomeloID: pomeloCard.pomeloID,
    nobaConsumerID: pomeloCard.nobaConsumerID,
    status: pomeloCard.status as PomeloCardStatus,
    type: pomeloCard.type as PomeloCardType,
    createdTimestamp: pomeloCard.createdTimestamp,
    updatedTimestamp: pomeloCard.updatedTimestamp,
  };
};
