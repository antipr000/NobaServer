import { Module } from "@nestjs/common";
import { ExchangeRateWorkflowController } from "./workflow/exchangerate.workflow.controller";
import { ExchangeRateService } from "./exchangerate.service";
import { SQLExchangeRateRepo } from "./repo/sql.exchangerate.repo";
import { InfraProvidersModule } from "../../infraproviders/infra.module";
import { AlertService } from "../common/alerts/alert.service";
import { ExchangeRateFactoryModule } from "./factory/exchangerate.factory.module";
import { CommonModule } from "../common/common.module";

@Module({
  imports: [InfraProvidersModule, ExchangeRateFactoryModule, CommonModule],
  controllers: [ExchangeRateWorkflowController],
  providers: [
    ExchangeRateService,
    {
      provide: "ExchangeRateRepo",
      useClass: SQLExchangeRateRepo,
    },
    AlertService,
  ],
  exports: [ExchangeRateService],
})
export class ExchangeRateModule {}
