import {
  PaymentMethod as PaymentMethodModel,
  PaymentMethodStatus,
  PaymentMethodType,
  PaymentProvider,
  Card as CardModel,
  ACH as ACHModel,
} from "@prisma/client";
import Joi from "joi";
import { KeysRequired } from "../../../modules/common/domain/Types";

export class PaymentMethod implements PaymentMethodModel {
  id: number;
  name: string | null;
  type: PaymentMethodType;
  paymentToken: string;
  paymentProvider: PaymentProvider;
  status: PaymentMethodStatus;
  isDefault: boolean;
  imageUri: string | null;
  consumerID: string;
  cardData?: Card;
  achData?: ACH;
}

class Card implements CardModel {
  id: number;
  cardType: string | null;
  scheme: string | null;
  first6Digits: string;
  last4Digits: string;
  authCode: string | null;
  authReason: string | null;
  paymentMethodID: number;
}

class ACH implements ACHModel {
  id: number;
  accountID: string;
  accessToken: string;
  itemID: string;
  mask: string;
  accountType: string;
  paymentMethodID: number;
}

export const paymentMethodJoiValidationKeys: KeysRequired<PaymentMethod> = {
  id: Joi.number().required(),
  name: Joi.string().optional().allow(null),
  type: Joi.string().required().valid(Object.keys(PaymentMethodType)),
  paymentToken: Joi.string().required(),
  paymentProvider: Joi.string().valid(Object.keys(PaymentProvider)).default(PaymentProvider.CHECKOUT),
  status: Joi.string().required().valid(Object.keys(PaymentMethodStatus)),
  isDefault: Joi.boolean().default(false),
  imageUri: Joi.string().optional().allow(null),
  consumerID: Joi.string().required(),
  cardData: Joi.object().optional(),
  achData: Joi.object().optional(),
};
