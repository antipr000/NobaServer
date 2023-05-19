import { KeysRequired } from "../../../modules/common/domain/Types";
import Joi from "joi";
import { ReminderHistory as PrismaReminderHistoryModel } from "@prisma/client";

export class ReminderHistory {
  id: string;
  createdTimestamp: Date;
  updatedTimestamp: Date;
  reminderScheduleID: string;
  consumerID: string;
  lastSentTimestamp: Date;
}

export class ReminderHistoryCreateRequest {
  reminderScheduleID: string;
  consumerID: string;
  lastSentTimestamp: Date;
}

export class ReminderHistoryUpdateRequest {
  lastSentTimestamp?: Date;
}

export const validateReminderHistoryCreateRequest = (payload: ReminderHistoryCreateRequest) => {
  const reminderHistoryJoiValidationKeys: KeysRequired<ReminderHistoryCreateRequest> = {
    reminderScheduleID: Joi.string().required(),
    consumerID: Joi.string().required(),
    lastSentTimestamp: Joi.date().required(),
  };

  const reminderHistoryJoiSchema = Joi.object(reminderHistoryJoiValidationKeys).options({
    allowUnknown: false,
    stripUnknown: true,
  });
  Joi.attempt(payload, reminderHistoryJoiSchema);
};

export const validateReminderHistoryUpdateRequest = (payload: ReminderHistoryUpdateRequest) => {
  const reminderHistoryJoiValidationKeys: KeysRequired<ReminderHistoryUpdateRequest> = {
    lastSentTimestamp: Joi.date().optional(),
  };

  const reminderHistoryJoiSchema = Joi.object(reminderHistoryJoiValidationKeys).options({
    allowUnknown: false,
    stripUnknown: true,
  });
  Joi.attempt(payload, reminderHistoryJoiSchema);
};

export const validateReminderHistory = (reminderHistory: ReminderHistory) => {
  const reminderHistoryJoiValidationKeys: KeysRequired<ReminderHistory> = {
    id: Joi.string().required(),
    createdTimestamp: Joi.date().required(),
    updatedTimestamp: Joi.date().required(),
    reminderScheduleID: Joi.string().required(),
    consumerID: Joi.string().required(),
    lastSentTimestamp: Joi.date().required(),
  };

  const reminderHistoryJoiSchema = Joi.object(reminderHistoryJoiValidationKeys).options({
    allowUnknown: false,
    stripUnknown: true,
  });
  Joi.attempt(reminderHistory, reminderHistoryJoiSchema);
};

export const convertToDomainReminderHistory = (reminderHistory: PrismaReminderHistoryModel): ReminderHistory => {
  return {
    id: reminderHistory.id,
    createdTimestamp: reminderHistory.createdTimestamp,
    updatedTimestamp: reminderHistory.updatedTimestamp,
    reminderScheduleID: reminderHistory.reminderScheduleID,
    consumerID: reminderHistory.consumerID,
    lastSentTimestamp: reminderHistory.lastSentTimestamp,
  };
};
