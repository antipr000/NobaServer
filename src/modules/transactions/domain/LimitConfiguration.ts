import { KeysRequired } from "../../../modules/common/domain/Types";
import { Entity, BaseProps, basePropsJoiSchemaKeys } from "../../../core/domain/Entity";
import Joi from "joi";
import { AggregateRoot } from "../../../core/domain/AggregateRoot";
import { TransactionType } from "./Types";

interface LimitConfigurationCriteria {
  transactionType?: TransactionType[];
  minProfileAge?: number;
  minBalanceInWallet?: number;
  minTotalTransactionAmount?: number;
}

export interface LimitConfigurationProps extends BaseProps {
  _id: string;
  isDefault: boolean;
  priority: number;
  profile: string;
  criteria: LimitConfigurationCriteria;
}

const limitConfigurationCriteriaValidationKeys: KeysRequired<LimitConfigurationCriteria> = {
  transactionType: Joi.array()
    .items(Joi.string().valid(...Object.values(TransactionType)))
    .default([]),
  minProfileAge: Joi.number().optional(),
  minBalanceInWallet: Joi.number().optional(),
  minTotalTransactionAmount: Joi.number().optional(),
};

export const limitConfigurationValidationKeys: KeysRequired<LimitConfigurationProps> = {
  ...basePropsJoiSchemaKeys,
  _id: Joi.string().required(),
  isDefault: Joi.boolean().default(false),
  priority: Joi.number()
    .required()
    .meta({ _mongoose: { index: true, unique: true } }),
  profile: Joi.string().required(),
  criteria: Joi.object().keys(limitConfigurationCriteriaValidationKeys).required(),
};

export const limitConfigurationJoiSchema = Joi.object(limitConfigurationValidationKeys).options({ allowUnknown: true });

export class LimitConfiguration extends AggregateRoot<LimitConfigurationProps> {
  private constructor(limitConfigurationProps: LimitConfigurationProps) {
    super(limitConfigurationProps);
  }

  public static createLimitConfiguration(
    limitConfigurationProps: Partial<LimitConfigurationProps>,
  ): LimitConfiguration {
    if (!limitConfigurationProps._id) limitConfigurationProps._id = Entity.getNewID();

    return new LimitConfiguration(Joi.attempt(limitConfigurationProps, limitConfigurationJoiSchema));
  }
}
