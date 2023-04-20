import { KeysRequired } from "../../../modules/common/domain/Types";
import { EventTypes } from "./EventTypes";
import Joi from "joi";
import { EventTemplate as PrismaEventTemplateModel } from "@prisma/client";

export class EventTemplate {
  id: string;
  createdTimestamp: Date;
  updatedTimestamp: Date;
  templateBody?: string;
  externalKey?: string;
  type: EventTypes;
  locale: string;
  eventID: string;
}

export class EventTemplateCreateRequest {
  templateBody?: string;
  externalKey?: string;
  type: EventTypes;
  locale: string;
  eventID: string;
}

export class EventTemplateUpdateRequest {
  templateBody?: string;
  externalKey?: string;
  type: EventTypes;
  locale: string;
}

export const validateEventTemplateCreateRequest = (eventTemplate: EventTemplateCreateRequest) => {
  const eventTemplateJoiValidationKeys: KeysRequired<EventTemplateCreateRequest> = {
    templateBody: Joi.string().optional(),
    externalKey: Joi.string().optional(),
    type: Joi.string().allow(Object.values(EventTypes)).required(),
    locale: Joi.string().required(),
    eventID: Joi.string().required(),
  };

  const eventTemplateJoiSchema = Joi.object(eventTemplateJoiValidationKeys).options({
    allowUnknown: false,
    stripUnknown: true,
  });
  Joi.attempt(eventTemplate, eventTemplateJoiSchema);
};

export const validateEventTemplateUpdateRequest = (eventTemplate: EventTemplateUpdateRequest) => {
  const eventTemplateJoiValidationKeys: KeysRequired<EventTemplateUpdateRequest> = {
    templateBody: Joi.string().optional(),
    externalKey: Joi.string().optional(),
    type: Joi.string().allow(Object.values(EventTypes)).required(),
    locale: Joi.string().required(),
  };

  const eventTemplateJoiSchema = Joi.object(eventTemplateJoiValidationKeys).options({
    allowUnknown: false,
    stripUnknown: true,
  });
  Joi.attempt(eventTemplate, eventTemplateJoiSchema);
};

export const eventTemplateJoiValidationKeys: KeysRequired<EventTemplateUpdateRequest> = {
  templateBody: Joi.string().optional(),
  externalKey: Joi.string().optional(),
  type: Joi.string().allow(Object.values(EventTypes)).required(),
  locale: Joi.string().required(),
};

export const validateEventTemplate = (eventTemplate: EventTemplate) => {
  const eventTemplateJoiValidationKeys: KeysRequired<EventTemplate> = {
    id: Joi.string().required(),
    createdTimestamp: Joi.date().required(),
    updatedTimestamp: Joi.date().required(),
    templateBody: Joi.string().optional(),
    externalKey: Joi.string().optional(),
    type: Joi.string().allow(Object.values(EventTypes)).required(),
    locale: Joi.string().required(),
    eventID: Joi.string().required(),
  };

  const eventTemplateJoiSchema = Joi.object(eventTemplateJoiValidationKeys).options({
    allowUnknown: false,
    stripUnknown: true,
  });
  Joi.attempt(eventTemplate, eventTemplateJoiSchema);
};

export const convertToDomainEventTemplate = (eventTemplate: PrismaEventTemplateModel): EventTemplate => {
  return {
    id: eventTemplate.id,
    createdTimestamp: eventTemplate.createdTimestamp,
    updatedTimestamp: eventTemplate.updatedTimestamp,
    templateBody: eventTemplate.templateBody,
    externalKey: eventTemplate.externalKey,
    type: eventTemplate.type as EventTypes,
    locale: eventTemplate.locale,
    eventID: eventTemplate.eventID,
  };
};
