import Joi from "joi";
import { Circle as PrismaCircleModel } from "@prisma/client";
import { KeysRequired } from "../../common/domain/Types";

export class Circle {
  id: string;
  walletID: string;
  consumerID: string;
  currentBalance?: number;
  createdTimestamp?: Date;
  updatedTimestamp?: Date;
}

export class CircleCreateRequest {
  walletID: string;
  consumerID: string;
}

export class CircleUpdateRequest {
  currentBalance?: number;
}

export const validateCircleCreateRequest = (payload: CircleCreateRequest) => {
  const circleJoiValidationKeys: KeysRequired<CircleCreateRequest> = {
    walletID: Joi.string().required(),
    consumerID: Joi.string().required(),
  };

  const circleJoiSchema = Joi.object(circleJoiValidationKeys).options({
    allowUnknown: false,
    stripUnknown: true,
  });

  Joi.attempt(payload, circleJoiSchema);
};

export const validateCircleUpdateRequest = (payload: CircleUpdateRequest) => {
  const circleJoiValidationKeys: KeysRequired<CircleUpdateRequest> = {
    currentBalance: Joi.number().optional(),
  };

  const circleJoiSchema = Joi.object(circleJoiValidationKeys).options({
    allowUnknown: false,
    stripUnknown: true,
  });

  Joi.attempt(payload, circleJoiSchema);
};

export const validateCircle = (circle: Circle) => {
  const circleJoiValidationKeys: KeysRequired<Circle> = {
    id: Joi.string().required(),
    walletID: Joi.string().required(),
    consumerID: Joi.string().required(),
    currentBalance: Joi.number().optional(),
    createdTimestamp: Joi.date().optional(),
    updatedTimestamp: Joi.date().optional(),
  };

  const circleJoiSchema = Joi.object(circleJoiValidationKeys).options({
    allowUnknown: false,
    stripUnknown: true,
  });

  Joi.attempt(circle, circleJoiSchema);
};

export const convertToDomainCircle = (prismaCircle: PrismaCircleModel): Circle => {
  return {
    id: prismaCircle.id,
    walletID: prismaCircle.walletID,
    consumerID: prismaCircle.consumerID,
    ...(prismaCircle.currentBalance && { currentBalance: prismaCircle.currentBalance }),
    createdTimestamp: prismaCircle.createdTimestamp,
    updatedTimestamp: prismaCircle.updatedTimestamp,
  };
};
