import { Module } from "@nestjs/common";
import { InfraProvidersModule } from "../../infraproviders/infra.module";
import { EmployeeService } from "./employee.service";
import { EmployeeRepoModule } from "./repo/employee.repo.module";
import { NotificationsModule } from "../notifications/notification.module";

@Module({
  imports: [InfraProvidersModule, EmployeeRepoModule, NotificationsModule],
  controllers: [],
  providers: [EmployeeService],
  exports: [EmployeeService],
})
export class EmployeeModule {}
