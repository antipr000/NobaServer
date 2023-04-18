import Joi from "joi";
import { ExchangeRate as PrismaExchangeRateModel } from "@prisma/client";
import { KeysRequired } from "../../../modules/common/domain/Types";

export enum ExchangeRateName {
  STUB = "STUB",
}

export type ExchangeRatePair = {
  numeratorCurrency: string;
  denominatorCurrency: string;
};

export class ExchangeRate {
  id?: string;
  createdTimestamp?: Date;
  updatedTimestamp?: Date;
  numeratorCurrency: string;
  denominatorCurrency: string;
  bankRate: number;
  nobaRate: number;
  expirationTimestamp: Date;
}

export class InputExchangeRate {
  numeratorCurrency: string;
  denominatorCurrency: string;
  bankRate: number;
  nobaRate: number;
  expirationTimestamp: Date;
}

export const validateInputExchangeRate = (exchangeRate: InputExchangeRate) => {
  const exchangeRateJoiValidationKeys: KeysRequired<InputExchangeRate> = {
    numeratorCurrency: Joi.string().length(3).required(),
    denominatorCurrency: Joi.string().length(3).required(),
    bankRate: Joi.number().required(),
    nobaRate: Joi.number().required(),
    expirationTimestamp: Joi.date().required(),
  };

  const exchangeRateJoiSchema = Joi.object(exchangeRateJoiValidationKeys).options({
    allowUnknown: false,
    stripUnknown: true,
  });

  return Joi.attempt(exchangeRate, exchangeRateJoiSchema);
};

export const validateSavedExchangeRate = (exchangeRate: ExchangeRate) => {
  const exchangeRateJoiValidationKeys: KeysRequired<ExchangeRate> = {
    id: Joi.string().min(10).required(),
    createdTimestamp: Joi.date().required(),
    updatedTimestamp: Joi.date().required(),
    numeratorCurrency: Joi.string().length(3).required(),
    denominatorCurrency: Joi.string().length(3).required(),
    bankRate: Joi.number().required(),
    nobaRate: Joi.number().required(),
    expirationTimestamp: Joi.date().required(),
  };

  const exchangeRateJoiSchema = Joi.object(exchangeRateJoiValidationKeys).options({
    allowUnknown: false,
    stripUnknown: true,
  });

  return Joi.attempt(exchangeRate, exchangeRateJoiSchema);
};

export const convertToDomainExchangeRate = (prismaExchangeRate: PrismaExchangeRateModel): ExchangeRate => {
  return {
    id: prismaExchangeRate.id,
    createdTimestamp: prismaExchangeRate.createdTimestamp,
    updatedTimestamp: prismaExchangeRate.updatedTimestamp,
    numeratorCurrency: prismaExchangeRate.numeratorCurrency,
    denominatorCurrency: prismaExchangeRate.denominatorCurrency,
    bankRate: prismaExchangeRate.bankRate,
    nobaRate: prismaExchangeRate.nobaRate,
    expirationTimestamp: prismaExchangeRate.expirationTimestamp,
  };
};
