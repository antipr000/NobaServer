import { ConsumerConfiguration as PrismaConfigurationModel } from "@prisma/client";
import { KeysRequired } from "../../common/domain/Types";
import Joi from "joi";

export class ConsumerConfiguration {
  id: string;
  name: string;
  value: string;
  consumerID: string;
  createdTimestamp: Date;
  updatedTimestamp: Date;
}

export class ConsumerConfigurationCreateRequest {
  name: string;
  value: string;
  consumerID: string;
}

export class ConsumerConfigurationUpdateRequest {
  value?: string;
}

export const validateCreateConsumerConfigurationRequest = (
  consumerConfiguration: ConsumerConfigurationCreateRequest,
) => {
  const consumerConfigurationJoiValidationKeys: KeysRequired<ConsumerConfigurationCreateRequest> = {
    name: Joi.string().required(),
    value: Joi.string().required(),
    consumerID: Joi.string().required(),
  };

  const consumerConfigurationJoiSchema = Joi.object(consumerConfigurationJoiValidationKeys).options({
    allowUnknown: false,
    stripUnknown: true,
  });
  Joi.attempt(consumerConfiguration, consumerConfigurationJoiSchema);
};

export const validateUpdateConsumerConfigurationRequest = (
  consumerConfiguration: ConsumerConfigurationUpdateRequest,
) => {
  const consumerConfigurationJoiValidationKeys: KeysRequired<ConsumerConfigurationUpdateRequest> = {
    value: Joi.string().optional(),
  };

  const consumerConfigurationJoiSchema = Joi.object(consumerConfigurationJoiValidationKeys).options({
    allowUnknown: false,
    stripUnknown: true,
  });
  Joi.attempt(consumerConfiguration, consumerConfigurationJoiSchema);
};

export const validateConsumerConfiguration = (consumerConfiguration: ConsumerConfiguration) => {
  const consumerConfigurationJoiValidationKeys: KeysRequired<ConsumerConfiguration> = {
    id: Joi.string().required(),
    name: Joi.string().required(),
    value: Joi.string().required(),
    consumerID: Joi.string().required(),
    createdTimestamp: Joi.date().required(),
    updatedTimestamp: Joi.date().required(),
  };

  const consumerConfigurationJoiSchema = Joi.object(consumerConfigurationJoiValidationKeys).options({
    allowUnknown: false,
    stripUnknown: true,
  });
  Joi.attempt(consumerConfiguration, consumerConfigurationJoiSchema);
};

export const convertToDomainConsumerConfiguration = (
  consumerConfiguration: PrismaConfigurationModel,
): ConsumerConfiguration => {
  return {
    id: consumerConfiguration.id,
    name: consumerConfiguration.name,
    value: consumerConfiguration.value,
    consumerID: consumerConfiguration.consumerID,
    createdTimestamp: consumerConfiguration.createdTimestamp,
    updatedTimestamp: consumerConfiguration.updatedTimestamp,
  };
};
