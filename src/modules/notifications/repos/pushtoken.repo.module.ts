import { Module } from "@nestjs/common";
import { InfraProvidersModule } from "../../../infraproviders/infra.module";
import { SQLPushTokenRepo } from "./sql.pushtoken.repo";

const PushTokenRepoProvider = {
  provide: "PushTokenRepo",
  useClass: SQLPushTokenRepo,
};

@Module({
  imports: [InfraProvidersModule],
  controllers: [],
  providers: [PushTokenRepoProvider],
  exports: [PushTokenRepoProvider],
})
export class PushTokenRepoModule {}
