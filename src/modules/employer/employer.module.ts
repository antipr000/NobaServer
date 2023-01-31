import { Module } from "@nestjs/common";
import { InfraProvidersModule } from "../../infraproviders/infra.module";
import { EmployerController } from "./employer.controller";
import { EmployerService } from "./employer.service";
import { EmployerRepoModule } from "./repo/employer.repo.module";

@Module({
  imports: [InfraProvidersModule, EmployerRepoModule],
  controllers: [EmployerController],
  providers: [EmployerService],
  exports: [EmployerService],
})
export class EmployerModule {}
