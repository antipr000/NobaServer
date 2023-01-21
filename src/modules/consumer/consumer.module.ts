import { Module } from "@nestjs/common";
import { InfraProvidersModule } from "../../infraproviders/infra.module";
import { CommonModule } from "../common/common.module";
import { SanctionedCryptoWalletService } from "../common/sanctionedcryptowallet.service";
import { ConsumerController } from "./consumer.controller";
import { ConsumerService } from "./consumer.service";
import { NotificationsModule } from "../notifications/notification.module";
import { PspModule } from "../psp/psp.module";
import { SMSService } from "../common/sms.service";
import { ConsumerRepoModule } from "./repos/consumer.repo.module";
import { ConsumerMapper } from "./mappers/ConsumerMapper";
import { EmployeeModule } from "../employee/employee.module";
import { EmployerModule } from "../employer/employer.module";

@Module({
  imports: [
    InfraProvidersModule,
    CommonModule,
    NotificationsModule,
    PspModule,
    ConsumerRepoModule,
    EmployeeModule,
    EmployerModule,
  ],
  controllers: [ConsumerController],
  providers: [ConsumerService, SanctionedCryptoWalletService, SMSService, ConsumerMapper],
  exports: [ConsumerService, ConsumerMapper],
})
export class ConsumerModule {}
