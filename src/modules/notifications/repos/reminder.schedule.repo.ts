import {
  ReminderSchedule,
  ReminderScheduleCreateRequest,
  ReminderScheduleUpdateRequest,
} from "../domain/ReminderSchedule";

export interface ReminderScheduleRepo {
  createReminderSchedule(reminderSchedule: ReminderScheduleCreateRequest): Promise<ReminderSchedule>;
  updateReminderSchedule(id: string, reminderSchedule: ReminderScheduleUpdateRequest): Promise<ReminderSchedule>;
  getReminderScheduleByID(id: string): Promise<ReminderSchedule>;
  getReminderScheduleByEventID(eventID: string): Promise<ReminderSchedule>;
  getAllReminderSchedulesForGroup(groupKey: string): Promise<ReminderSchedule[]>;
  deleteReminderSchedule(id: string): Promise<void>;
}
