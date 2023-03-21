import Joi from "joi";
import { PomeloUser as PrismaPomeloUserModel } from "@prisma/client";
import { KeysRequired } from "../../../common/domain/Types";

export class PomeloUser {
  id: string;
  consumerID: string;
  pomeloID: string;
  createdTimestamp: Date;
  updatedTimestamp: Date;
}

export class PomeloUserSaveRequest {
  pomeloUserID: string;
  consumerID: string;
}

export const validateSavePomeloUserRequest = (request: PomeloUserSaveRequest) => {
  const pomeloUserJoiValidationKeys: KeysRequired<PomeloUserSaveRequest> = {
    pomeloUserID: Joi.string().required(),
    consumerID: Joi.string().required(),
  };
  const pomeloUsersJoiSchema = Joi.object(pomeloUserJoiValidationKeys).options({
    allowUnknown: false,
    stripUnknown: true,
  });

  Joi.attempt(request, pomeloUsersJoiSchema);
};

export const validatePomeloUser = (pomeloUser: PomeloUser) => {
  const pomeloUserJoiValidationKeys: KeysRequired<PomeloUser> = {
    id: Joi.string().required(),
    pomeloID: Joi.string().required(),
    consumerID: Joi.string().required(),
    createdTimestamp: Joi.date().required(),
    updatedTimestamp: Joi.date().required(),
  };
  const pomeloUsersJoiSchema = Joi.object(pomeloUserJoiValidationKeys).options({
    allowUnknown: false,
    stripUnknown: true,
  });

  Joi.attempt(pomeloUser, pomeloUsersJoiSchema);
};

export const convertToDomainPomeloUser = (pomeloUser: PrismaPomeloUserModel): PomeloUser => {
  return {
    id: pomeloUser.id,
    consumerID: pomeloUser.consumerID,
    pomeloID: pomeloUser.pomeloID,
    createdTimestamp: pomeloUser.createdTimestamp,
    updatedTimestamp: pomeloUser.updatedTimestamp,
  };
};
