import { NobaCard as PrismaNobaCardModel } from "@prisma/client";
import Joi from "joi";
import { KeysRequired } from "../../../../modules/common/domain/Types";

export enum NobaCardType {
  VIRTUAL = "VIRTUAL",
}

export enum NobaCardStatus {
  BLOCKED = "BLOCKED",
  DISABLED = "DISABLED",
  ACTIVE = "ACTIVE",
}

export enum CardProvider {
  POMELO = "POMELO",
}

export class NobaCard {
  id: string;
  provider: CardProvider;
  status: NobaCardStatus;
  type: NobaCardType;
  consumerID: string;
  createdTimestamp: Date;
  updatedTimestamp: Date;
}

export const validateNobaCard = (nobaCard: NobaCard) => {
  const nobaCardJoiValidationKeys: KeysRequired<NobaCard> = {
    id: Joi.string().required(),
    consumerID: Joi.string().required(),
    provider: Joi.string()
      .required()
      .valid(...Object.values(CardProvider)),
    status: Joi.string()
      .required()
      .valid(...Object.values(NobaCardStatus)),
    type: Joi.string()
      .required()
      .valid(...Object.values(NobaCardType)),
    createdTimestamp: Joi.date().required(),
    updatedTimestamp: Joi.date().required(),
  };
  const nobaCardJoiSchema = Joi.object(nobaCardJoiValidationKeys).options({
    allowUnknown: false,
    stripUnknown: true,
  });

  Joi.attempt(nobaCard, nobaCardJoiSchema);
};

export const convertToDomainNobaCard = (nobaCard: PrismaNobaCardModel): NobaCard => {
  return {
    id: nobaCard.id,
    provider: nobaCard.provider as CardProvider,
    consumerID: nobaCard.consumerID,
    type: nobaCard.type as NobaCardType,
    status: nobaCard.status as NobaCardStatus,
    createdTimestamp: nobaCard.createdTimestamp,
    updatedTimestamp: nobaCard.updatedTimestamp,
  };
};
