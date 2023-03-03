import { Module } from "@nestjs/common";
import { CommonModule } from "../../../modules/common/common.module";
import { InfraProvidersModule } from "../../../infraproviders/infra.module";
import { SqlEmployerRepo } from "./sql.employer.repo";

export const EMPLOYER_REPO_PROVIDER = "EMPLOYER_REPO";

@Module({
  imports: [InfraProvidersModule, CommonModule],
  controllers: [],
  providers: [
    {
      provide: EMPLOYER_REPO_PROVIDER,
      useClass: SqlEmployerRepo,
    },
  ],
  exports: [EMPLOYER_REPO_PROVIDER],
})
export class EmployerRepoModule {}
