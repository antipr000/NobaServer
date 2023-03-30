import { ConsumerConfiguration as PrismaConfigurationModel } from "@prisma/client";
import { KeysRequired } from "../../../modules/common/domain/Types";
import Joi from "joi";

export class Configuration {
  id: string;
  name: string;
  value: string;
  consumerID: string;
  createdTimestamp: Date;
  updatedTimestamp: Date;
}

export class ConfigurationCreateRequest {
  name: string;
  value: string;
  consumerID: string;
}

export class ConfigurationUpdateRequest {
  value?: string;
}

export const validateCreateConfigurationRequest = (configuration: ConfigurationCreateRequest) => {
  const configurationJoiValidationKeys: KeysRequired<ConfigurationCreateRequest> = {
    name: Joi.string().required(),
    value: Joi.string().required(),
    consumerID: Joi.string().required(),
  };

  const configurationJoiSchema = Joi.object(configurationJoiValidationKeys).options({
    allowUnknown: false,
    stripUnknown: true,
  });
  Joi.attempt(configuration, configurationJoiSchema);
};

export const validateUpdateConfigurationRequest = (configuration: ConfigurationUpdateRequest) => {
  const configurationJoiValidationKeys: KeysRequired<ConfigurationUpdateRequest> = {
    value: Joi.string().optional(),
  };

  const configurationJoiSchema = Joi.object(configurationJoiValidationKeys).options({
    allowUnknown: false,
    stripUnknown: true,
  });
  Joi.attempt(configuration, configurationJoiSchema);
};

export const validateConfiguration = (configuration: Configuration) => {
  const configurationJoiValidationKeys: KeysRequired<Configuration> = {
    id: Joi.string().required(),
    name: Joi.string().required(),
    value: Joi.string().required(),
    consumerID: Joi.string().required(),
    createdTimestamp: Joi.date().required(),
    updatedTimestamp: Joi.date().required(),
  };

  const configurationJoiSchema = Joi.object(configurationJoiValidationKeys).options({
    allowUnknown: false,
    stripUnknown: true,
  });
  Joi.attempt(configuration, configurationJoiSchema);
};

export const convertToDomainConfiguration = (configuration: PrismaConfigurationModel): Configuration => {
  return {
    id: configuration.id,
    name: configuration.name,
    value: configuration.value,
    consumerID: configuration.consumerID,
    createdTimestamp: configuration.createdTimestamp,
    updatedTimestamp: configuration.updatedTimestamp,
  };
};
