import Joi from "joi";
import { KeysRequired } from "../../common/domain/Types";
import { PomeloCard as PrismaPomeloCardModel } from "@prisma/client";
import { NobaCardStatus, NobaCardType } from "../../psp/card/domain/NobaCard";

export class PomeloCard {
  id: string;
  nobaCardID: string;
  pomeloCardID: string;
  pomeloUserID: string;
  createdTimestamp: Date;
  updatedTimestamp: Date;
}

export class PomeloCardSaveRequest {
  pomeloCardID: string;
  pomeloUserID: string;
  nobaConsumerID: string;
  status: NobaCardStatus;
  last4Digits: string;
  type: NobaCardType;
}

export class PomeloCardUpdateRequest {
  nobaCardID: string;
  status: NobaCardStatus;
}

export const validateSavePomeloCardRequest = (request: PomeloCardSaveRequest) => {
  const pomeloCardJoiValidationKeys: KeysRequired<PomeloCardSaveRequest> = {
    pomeloCardID: Joi.string().required(),
    pomeloUserID: Joi.string().required(),
    nobaConsumerID: Joi.string().required(),
    status: Joi.string()
      .required()
      .valid(...Object.values(NobaCardStatus)),
    type: Joi.string()
      .required()
      .valid(...Object.values(NobaCardType)),
    last4Digits: Joi.string().required(),
  };
  const pomeloCardJoiSchema = Joi.object(pomeloCardJoiValidationKeys).options({
    allowUnknown: false,
    stripUnknown: true,
  });

  Joi.attempt(request, pomeloCardJoiSchema);
};

export const validateUpdatePomeloCardRequest = (request: PomeloCardUpdateRequest) => {
  const pomeloCardJoiValidationKeys: KeysRequired<PomeloCardUpdateRequest> = {
    nobaCardID: Joi.string().required(),
    status: Joi.string()
      .required()
      .valid(...Object.values(NobaCardStatus)),
  };
  const pomeloCardJoiSchema = Joi.object(pomeloCardJoiValidationKeys).options({
    allowUnknown: false,
    stripUnknown: true,
  });

  Joi.attempt(request, pomeloCardJoiSchema);
};

export const validatePomeloCard = (pomeloCard: PomeloCard) => {
  const pomeloCardJoiValidationKeys: KeysRequired<PomeloCard> = {
    id: Joi.string().required(),
    pomeloCardID: Joi.string().required(),
    nobaCardID: Joi.string().required(),
    pomeloUserID: Joi.string().required(),
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
    pomeloCardID: pomeloCard.pomeloCardID,
    nobaCardID: pomeloCard.nobaCardID,
    pomeloUserID: pomeloCard.pomeloUserID,
    createdTimestamp: pomeloCard.createdTimestamp,
    updatedTimestamp: pomeloCard.updatedTimestamp,
  };
};
