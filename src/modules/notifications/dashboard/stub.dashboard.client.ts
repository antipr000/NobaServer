import { Inject, Injectable } from "@nestjs/common";
import { Logger } from "winston";
import { WINSTON_MODULE_PROVIDER } from "nest-winston";
import { DashboardClient } from "./dashboard.client";
import { NewEmployeeRegisterRequest } from "../domain/dashboard.client.dto";
import { PayrollStatus } from "../../../../src/modules/employer/domain/Payroll";

@Injectable()
export class StubDashboardClient implements DashboardClient {
  constructor(@Inject(WINSTON_MODULE_PROVIDER) private readonly logger: Logger) {}
  async registerNewEmployee(newEmployeeRegisterRequest: NewEmployeeRegisterRequest): Promise<void> {
    this.logger.info(
      `Received dashboard client call to register new employee: ${JSON.stringify(newEmployeeRegisterRequest)}`,
    );
  }
  async updateEmployeeAllocationAmount(nobaEmployeeID: string, allocationAmountInPesos: number): Promise<void> {
    this.logger.info(
      `Received dashboard client call to update employee allocation amount: ${nobaEmployeeID} to ${allocationAmountInPesos}`,
    );
  }

  async updatePayrollStatus(status: PayrollStatus, nobaPayrollID: string): Promise<void> {
    this.logger.info(
      `Received dashboard client call to update payroll status to ${status} for payroll ${nobaPayrollID}`,
    );
  }
}
