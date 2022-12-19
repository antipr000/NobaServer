import { KeysRequired } from "../../../modules/common/domain/Types";
import { Entity, basePropsJoiSchemaKeys } from "../../../core/domain/Entity";
import Joi from "joi";
import { AggregateRoot } from "../../../core/domain/AggregateRoot";
import { LimitProfile as LimitProfileModel } from "@prisma/client";

export class LimitProfileProps implements Partial<LimitProfileModel> {
  id: string;
  name: string;
  daily?: number;
  weekly?: number;
  monthly: number;
  maxTransaction: number;
  minTransaction: number;
  unsettledExposure?: number;
  createdTimestamp?: Date;
  updatedTimestamp?: Date;
}

export const limitProfileJoiValidationKeys: KeysRequired<LimitProfileProps> = {
  ...basePropsJoiSchemaKeys,
  id: Joi.string().required(),
  name: Joi.string().required(),
  unsettledExposure: Joi.number().optional(),
  daily: Joi.number().optional(),
  weekly: Joi.number().optional(),
  monthly: Joi.number().required(),
  maxTransaction: Joi.number().required(),
  minTransaction: Joi.number().required(),
};

export const limitProfileJoiSchema = Joi.object(limitProfileJoiValidationKeys).options({ allowUnknown: true }); // Needed for timstamps

export class LimitProfile extends AggregateRoot<LimitProfileProps> {
  private constructor(limitProfileProps: LimitProfileProps) {
    super(limitProfileProps);
  }

  public static createLimitProfile(limitProfileProps: Partial<LimitProfileProps>): LimitProfile {
    if (!limitProfileProps.id) limitProfileProps.id = Entity.getNewID();

    return new LimitProfile(Joi.attempt(limitProfileProps, limitProfileJoiSchema));
  }
}
