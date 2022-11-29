import { KeysRequired } from "../../../modules/common/domain/Types";
import { Entity, VersioningInfo, versioningInfoJoiSchemaKeys } from "../../../core/domain/Entity";
import Joi from "joi";
import { AggregateRoot } from "../../../core/domain/AggregateRoot";

export interface Limits {
  daily?: number;
  weekly?: number;
  monthly: number;
  maxTransaction: number;
  minTransaction: number;
}

export interface LimitProfileProps extends VersioningInfo {
  _id: string;
  name: string;
  cardLimits: Limits;
  bankLimits: Limits;
  unsettledExposure: number;
}

const limitsJoiValidationKeys: KeysRequired<Limits> = {
  daily: Joi.number().optional(),
  weekly: Joi.number().optional(),
  monthly: Joi.number().required(),
  maxTransaction: Joi.number().required(),
  minTransaction: Joi.number().required(),
};

export const limitProfileJoiValidationKeys: KeysRequired<LimitProfileProps> = {
  ...versioningInfoJoiSchemaKeys,
  _id: Joi.string().required(),
  name: Joi.string().required(),
  cardLimits: Joi.object().keys(limitsJoiValidationKeys).required(),
  bankLimits: Joi.object().keys(limitsJoiValidationKeys).required(),
  unsettledExposure: Joi.number().required(),
};

export const limitProfileJoiSchema = Joi.object(limitProfileJoiValidationKeys).options({ allowUnknown: true }); // Needed for timstamps

export class LimitProfile extends AggregateRoot<LimitProfileProps> {
  private constructor(limitProfileProps: LimitProfileProps) {
    super(limitProfileProps);
  }

  public static createLimitProfile(limitProfileProps: Partial<LimitProfileProps>): LimitProfile {
    if (!limitProfileProps._id) limitProfileProps._id = Entity.getNewID();

    return new LimitProfile(Joi.attempt(limitProfileProps, limitProfileJoiSchema));
  }
}
