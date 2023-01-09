import { KeysRequired } from "../../common/domain/Types";
import { Entity, basePropsJoiSchemaKeys } from "../../../core/domain/Entity";
import Joi from "joi";
import { AggregateRoot } from "../../../core/domain/AggregateRoot";
import { LimitConfiguration as LimitConfigurationModel, PaymentMethodType, TransactionType } from "@prisma/client";

export class LimitConfigurationProps implements Partial<LimitConfigurationModel> {
  id: string;
  isDefault: boolean;
  priority: number;
  profileID: string;
  transactionType?: TransactionType;
  minProfileAge?: number;
  minBalanceInWallet?: number;
  minTotalTransactionAmount?: number;
  paymentMethodType?: PaymentMethodType;
  createdTimestamp?: Date;
  updatedTimestamp?: Date;
}

export const limitConfigurationValidationKeys: KeysRequired<LimitConfigurationProps> = {
  ...basePropsJoiSchemaKeys,
  id: Joi.string().required(),
  isDefault: Joi.boolean().default(false),
  priority: Joi.number().required(),
  profileID: Joi.string().required(),
  transactionType: Joi.string().optional(),
  minProfileAge: Joi.number().optional(),
  minBalanceInWallet: Joi.number().optional(),
  minTotalTransactionAmount: Joi.number().optional(),
  paymentMethodType: Joi.string().optional(),
};

export const limitConfigurationJoiSchema = Joi.object(limitConfigurationValidationKeys).options({ allowUnknown: true });

export class LimitConfiguration extends AggregateRoot<LimitConfigurationProps> {
  private constructor(limitConfigurationProps: LimitConfigurationProps) {
    super(limitConfigurationProps);
  }

  public static createLimitConfiguration(
    limitConfigurationProps: Partial<LimitConfigurationProps>,
  ): LimitConfiguration {
    if (!limitConfigurationProps.id) limitConfigurationProps.id = Entity.getNewID();
    return new LimitConfiguration(Joi.attempt(limitConfigurationProps, limitConfigurationJoiSchema));
  }
}
