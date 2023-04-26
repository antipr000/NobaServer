import { Module } from "@nestjs/common";
import { InfraProvidersModule } from "../../../infraproviders/infra.module";
import { SQLPushTokenRepo } from "./sql.pushtoken.repo";
import { SQLEventRepo } from "./sql.event.repo";

const PushTokenRepoProvider = {
  provide: "PushTokenRepo",
  useClass: SQLPushTokenRepo,
};

const EventRepoProvider = {
  provide: "EventRepo",
  useClass: SQLEventRepo,
};

@Module({
  imports: [InfraProvidersModule],
  controllers: [],
  providers: [PushTokenRepoProvider, EventRepoProvider],
  exports: [PushTokenRepoProvider, EventRepoProvider],
})
export class NotificationRepoModule {}
