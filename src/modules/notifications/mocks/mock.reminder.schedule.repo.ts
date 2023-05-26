import { anyString, anything, mock, when } from "ts-mockito";
import { ReminderScheduleRepo } from "../repos/reminder.schedule.repo";
import { SQLReminderScheduleRepo } from "../repos/sql.reminder.schedule.repo";

export function getMockReminderScheduleRepoWithDefaults(): ReminderScheduleRepo {
  const mockRepo = mock(SQLReminderScheduleRepo);
  when(mockRepo.createReminderSchedule(anything())).thenReject(new Error("Not implemented"));
  when(mockRepo.updateReminderSchedule(anyString(), anything())).thenReject(new Error("Not implemented"));
  when(mockRepo.getAllReminderSchedulesForGroup(anyString())).thenReject(new Error("Not implemented"));
  when(mockRepo.getReminderScheduleByID(anyString())).thenReject(new Error("Not implemented"));
  when(mockRepo.getReminderScheduleByEventID(anyString())).thenReject(new Error("Not implemented"));
  when(mockRepo.deleteReminderSchedule(anyString())).thenReject(new Error("Not implemented"));
  return mockRepo;
}
