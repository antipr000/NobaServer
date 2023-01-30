import { Module } from "@nestjs/common";
import { InfraProvidersModule } from "../../../infraproviders/infra.module";
import { SQLPushtokenRepo } from "./sql.pushtoken.repo";

const PushtokenRepoProvider = {
  provide: "PushtokenRepo",
  useClass: SQLPushtokenRepo,
};

@Module({
  imports: [InfraProvidersModule],
  controllers: [],
  providers: [PushtokenRepoProvider],
  exports: [PushtokenRepoProvider],
})
export class PushtokenRepoModule {}
