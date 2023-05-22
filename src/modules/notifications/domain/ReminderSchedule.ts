import { KeysRequired } from "../../../modules/common/domain/Types";
import Joi from "joi";
import { ReminderSchedule as PrismaReminderScheduleModel } from "@prisma/client";

export class ReminderSchedule {
  id: string;
  createdTimestamp: Date;
  updatedTimestamp: Date;
  eventID: string;
  query: string;
  groupKey: string;
}

export class ReminderScheduleCreateRequest {
  eventID: string;
  query: string;
  groupKey: string;
}

export class ReminderScheduleUpdateRequest {
  query?: string;
  groupKey?: string;
}

export const validateReminderScheduleCreateRequest = (payload: ReminderScheduleCreateRequest) => {
  const reminderScheduleJoiValidationKeys: KeysRequired<ReminderScheduleCreateRequest> = {
    eventID: Joi.string().required(),
    query: Joi.string().required(),
    groupKey: Joi.string().required(),
  };

  const reminderScheduleJoiSchema = Joi.object(reminderScheduleJoiValidationKeys).options({
    allowUnknown: false,
    stripUnknown: true,
  });
  Joi.attempt(payload, reminderScheduleJoiSchema);
};

export const validateReminderScheduleUpdateRequest = (payload: ReminderScheduleUpdateRequest) => {
  const reminderScheduleJoiValidationKeys: KeysRequired<ReminderScheduleUpdateRequest> = {
    query: Joi.string().optional(),
    groupKey: Joi.string().optional(),
  };

  const reminderScheduleJoiSchema = Joi.object(reminderScheduleJoiValidationKeys).options({
    allowUnknown: false,
    stripUnknown: true,
  });
  Joi.attempt(payload, reminderScheduleJoiSchema);
};

export const validateReminderSchedule = (reminderSchedule: ReminderSchedule) => {
  const reminderScheduleJoiValidationKeys: KeysRequired<ReminderSchedule> = {
    id: Joi.string().required(),
    createdTimestamp: Joi.date().required(),
    updatedTimestamp: Joi.date().required(),
    eventID: Joi.string().required(),
    query: Joi.string().required(),
    groupKey: Joi.string().required(),
  };

  const reminderScheduleJoiSchema = Joi.object(reminderScheduleJoiValidationKeys).options({
    allowUnknown: false,
    stripUnknown: true,
  });
  Joi.attempt(reminderSchedule, reminderScheduleJoiSchema);
};

// TODO: Decide on whether we want to have event from db directly or not.
export const convertToDomainReminderSchedule = (reminderSchedule: PrismaReminderScheduleModel): ReminderSchedule => {
  return {
    id: reminderSchedule.id,
    createdTimestamp: reminderSchedule.createdTimestamp,
    updatedTimestamp: reminderSchedule.updatedTimestamp,
    eventID: reminderSchedule.eventID,
    query: reminderSchedule.query,
    groupKey: reminderSchedule.groupKey,
  };
};
