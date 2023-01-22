import { Module } from "@nestjs/common";
import { InfraProvidersModule } from "../../infraproviders/infra.module";
import { EmployerService } from "./employer.service";
import { EmployerRepoModule } from "./repo/employer.repo.module";

@Module({
  imports: [InfraProvidersModule, EmployerRepoModule],
  controllers: [],
  providers: [EmployerService],
  exports: [EmployerService],
})
export class EmployerModule {}
