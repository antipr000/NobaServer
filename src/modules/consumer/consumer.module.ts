import { Module } from "@nestjs/common";
import { InfraProvidersModule } from "../../infraproviders/infra.module";
import { CommonModule } from "../common/common.module";
import { SanctionedCryptoWalletService } from "../common/sanctionedcryptowallet.service";
import { ConsumerController } from "./consumer.controller";
import { ConsumerService } from "./consumer.service";
import { NotificationsModule } from "../notifications/notification.module";
import { ConsumerRepoModule } from "./repos/consumer.repo.module";
import { ConsumerMapper } from "./mappers/ConsumerMapper";
import { EmployeeModule } from "../employee/employee.module";

@Module({
  imports: [InfraProvidersModule, CommonModule, NotificationsModule, ConsumerRepoModule, EmployeeModule],
  controllers: [ConsumerController],
  providers: [ConsumerService, SanctionedCryptoWalletService, ConsumerMapper],
  exports: [ConsumerService, ConsumerMapper],
})
export class ConsumerModule {}
