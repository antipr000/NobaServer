import { anyString, anything, mock, when } from "ts-mockito";
import { ReminderHistoryRepo } from "../repos/reminder.history.repo";
import { SQLReminderHistoryRepo } from "../repos/sql.reminder.history.repo";

export function getMockReminderHistoryRepoWithDefaults(): ReminderHistoryRepo {
  const mockRepo = mock(SQLReminderHistoryRepo);

  when(mockRepo.createReminderHistory(anything())).thenReject(new Error("Not implemented"));
  when(mockRepo.updateReminderHistory(anyString(), anything())).thenReject(new Error("Not implemented"));
  when(mockRepo.getReminderHistoryByID(anyString())).thenReject(new Error("Not implemented"));
  when(mockRepo.getLatestReminderHistoryForConsumer(anyString())).thenReject(new Error("Not implemented"));
  when(mockRepo.getReminderHistoryByReminderScheduleIDAndConsumerID(anyString(), anyString())).thenReject(
    new Error("Not implemented"),
  );
  return mockRepo;
}
