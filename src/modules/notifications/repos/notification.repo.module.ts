import { Module } from "@nestjs/common";
import { InfraProvidersModule } from "../../../infraproviders/infra.module";
import { SQLPushTokenRepo } from "./sql.pushtoken.repo";
import { SQLEventRepo } from "./sql.event.repo";
import { SQLReminderScheduleRepo } from "./sql.reminder.schedule.repo";
import { SQLReminderHistoryRepo } from "./sql.reminder.history.repo";
import { CommonModule } from "../../../modules/common/common.module";

const PushTokenRepoProvider = {
  provide: "PushTokenRepo",
  useClass: SQLPushTokenRepo,
};

const EventRepoProvider = {
  provide: "EventRepo",
  useClass: SQLEventRepo,
};

const ReminderScheduleRepoProvider = {
  provide: "ReminderScheduleRepo",
  useClass: SQLReminderScheduleRepo,
};

const ReminderHistoryRepoProvider = {
  provide: "ReminderHistoryRepo",
  useClass: SQLReminderHistoryRepo,
};

@Module({
  imports: [InfraProvidersModule, CommonModule],
  controllers: [],
  providers: [PushTokenRepoProvider, EventRepoProvider, ReminderHistoryRepoProvider, ReminderScheduleRepoProvider],
  exports: [PushTokenRepoProvider, EventRepoProvider, ReminderHistoryRepoProvider, ReminderScheduleRepoProvider],
})
export class NotificationRepoModule {}
