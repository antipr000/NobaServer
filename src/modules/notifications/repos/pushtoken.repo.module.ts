import { Module } from "@nestjs/common";
import { InfraProvidersModule } from "../../../infraproviders/infra.module";
import { SQLPushtokenRepo } from "./sql.pushtoken.repo";
import { CommonModule } from "../../../modules/common/common.module";

const PushtokenRepoProvider = {
  provide: "PushtokenRepo",
  useClass: SQLPushtokenRepo,
};

@Module({
  imports: [InfraProvidersModule, CommonModule],
  controllers: [],
  providers: [PushtokenRepoProvider],
  exports: [PushtokenRepoProvider],
})
export class PushtokenRepoModule {}
