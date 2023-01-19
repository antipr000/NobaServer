import { Module } from "@nestjs/common";
import { InfraProvidersModule } from "../../../infraproviders/infra.module";
import { SqlEmployerRepo } from "./sql.employer.repo";

export const EMPLOYER_REPO_PROVIDER = "EMPLOYER_REPO";

@Module({
  imports: [InfraProvidersModule],
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
