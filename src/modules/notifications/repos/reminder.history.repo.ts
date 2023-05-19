import { ReminderHistory, ReminderHistoryCreateRequest, ReminderHistoryUpdateRequest } from "../domain/ReminderHistory";

export interface ReminderHistoryRepo {
  createReminderHistory(reminderHistory: ReminderHistoryCreateRequest): Promise<ReminderHistory>;
  updateReminderHistory(id: string, reminderHistory: ReminderHistoryUpdateRequest): Promise<ReminderHistory>;
  getReminderHistoryByID(id: string): Promise<ReminderHistory>;
  getReminderHistoryByReminderScheduleIDAndConsumerID(
    reminderScheduleID: string,
    consumerID: string,
  ): Promise<ReminderHistory>;
  getLatestReminderHistoryForConsumer(consumerID: string): Promise<ReminderHistory>;
}
