import {
  PaymentMethod as PaymentMethodModel,
  PaymentMethodStatus,
  PaymentMethodType,
  PaymentProvider,
  Card as CardModel,
  ACH as ACHModel,
} from "@prisma/client";
import Joi from "joi";
import { basePropsJoiSchemaKeys } from "../../../core/domain/Entity";
import { AggregateRoot } from "../../../core/domain/AggregateRoot";
import { KeysRequired } from "../../../modules/common/domain/Types";

export class PaymentMethodProps implements PaymentMethodModel {
  id: string;
  name: string | null;
  type: PaymentMethodType;
  paymentToken: string;
  createdTimestamp: Date | null;
  updatedTimestamp: Date | null;
  paymentProvider: PaymentProvider;
  status: PaymentMethodStatus;
  isDefault: boolean;
  imageUri: string | null;
  consumerID: string;
  cardData?: Card;
  achData?: ACH;
}

class Card implements CardModel {
  id: string;
  cardType: string | null;
  scheme: string | null;
  first6Digits: string;
  last4Digits: string;
  authCode: string | null;
  authReason: string | null;
  paymentMethodID: string;
}

class ACH implements ACHModel {
  id: string;
  accountID: string;
  accessToken: string;
  itemID: string;
  mask: string;
  accountType: string;
  paymentMethodID: string;
}

export const paymentMethodJoiValidationKeys: KeysRequired<PaymentMethodProps> = {
  ...basePropsJoiSchemaKeys,
  id: Joi.string().required(),
  name: Joi.string().optional().allow(null),
  type: Joi.string().required(),
  paymentToken: Joi.string().required(),
  paymentProvider: Joi.string().default(PaymentProvider.CHECKOUT),
  status: Joi.string().required(),
  isDefault: Joi.boolean().default(false),
  imageUri: Joi.string().optional().allow(null),
  consumerID: Joi.string().required(),
  cardData: Joi.object().optional(),
  achData: Joi.object().optional(),
};

export const paymentMethodJoiSchema = Joi.object(paymentMethodJoiValidationKeys).options({
  allowUnknown: true,
  stripUnknown: false,
});

export class PaymentMethod extends AggregateRoot<PaymentMethodProps> {
  private constructor(paymentMethodProps: PaymentMethodProps) {
    super(paymentMethodProps);
  }

  public static createPaymentMethod(paymentMethodProps: Partial<PaymentMethodProps>): PaymentMethod {
    if (!paymentMethodProps.id) paymentMethodProps.id = this.getNewID();
    if (!paymentMethodProps.isDefault) paymentMethodProps.isDefault = false;

    return new PaymentMethod(Joi.attempt(paymentMethodProps, paymentMethodJoiSchema));
  }
}
