import { KeysRequired } from "../../../modules/common/domain/Types";
import { EventTemplate, convertToDomainEventTemplate, eventTemplateJoiValidationKeys } from "./EventTemplates";
import Joi from "joi";
import { Event as PrismaEventModel, EventTemplate as PrismaEventTemplateModel } from "@prisma/client";
import { EventHandlers } from "./EventHandlers";

export type EventModel = PrismaEventModel & {
  templates: PrismaEventTemplateModel[];
};

export class Event {
  id: string;
  name: string;
  createdTimestamp: Date;
  updatedTimestamp: Date;
  handlers: EventHandlers[];
  templates: EventTemplate[];
}

export class EventCreateRequest {
  name: string;
  handlers: EventHandlers[];
}

export class EventUpdateRequest {
  handlers: string[];
}

export const validateEventCreateRequest = (event: EventCreateRequest) => {
  const eventJoiValidationKeys: KeysRequired<EventCreateRequest> = {
    name: Joi.string().required(),
    handlers: Joi.array()
      .items(Joi.string().valid(...Object.values(EventHandlers)))
      .min(1)
      .required(),
  };

  const eventJoiSchema = Joi.object(eventJoiValidationKeys).options({
    allowUnknown: false,
    stripUnknown: true,
  });
  Joi.attempt(event, eventJoiSchema);
};

export const eventJoiValidationKeys: KeysRequired<Event> = {
  id: Joi.string().required(),
  name: Joi.string().required(),
  createdTimestamp: Joi.date().required(),
  updatedTimestamp: Joi.date().required(),
  handlers: Joi.array()
    .items(Joi.string().valid(...Object.values(EventHandlers)))
    .min(1)
    .required(),
  templates: Joi.array().items(Joi.object(eventTemplateJoiValidationKeys)).required(),
};

export const validateEventUpdateRequest = (event: EventUpdateRequest) => {
  const eventJoiValidationKeys: KeysRequired<EventUpdateRequest> = {
    handlers: Joi.array()
      .items(Joi.string().valid(...Object.values(EventHandlers)))
      .min(1)
      .required(),
  };

  const eventJoiSchema = Joi.object(eventJoiValidationKeys).options({
    allowUnknown: false,
    stripUnknown: true,
  });
  Joi.attempt(event, eventJoiSchema);
};

export const validateEvent = (event: Event) => {
  const eventJoiSchema = Joi.object(eventJoiValidationKeys).options({
    allowUnknown: false,
    stripUnknown: true,
  });
  Joi.attempt(event, eventJoiSchema);
};

export const convertToDomainEvent = (event: EventModel): Event => {
  return {
    id: event.id,
    name: event.name,
    createdTimestamp: event.createdTimestamp,
    updatedTimestamp: event.updatedTimestamp,
    handlers: event.handlers.map(handler => handler as EventHandlers),
    templates: event.templates.map(template => convertToDomainEventTemplate(template)),
  };
};
