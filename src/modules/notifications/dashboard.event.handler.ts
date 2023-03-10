import { Inject, Injectable } from "@nestjs/common";
import { OnEvent } from "@nestjs/event-emitter";
import { NotificationEventType } from "./domain/NotificationTypes";
import { SendRegisterNewEmployeeEvent } from "./events/SendRegisterNewEmployeeEvent";
import { SendUpdateEmployeeAllocationAmontEvent } from "./events/SendUpdateEmployeeAllocationAmountEvent";
import { DashboardClient } from "./dashboard/dashboard.client";
import { SendUpdatePayrollStatusEvent } from "./events/SendUpdatePayrollStatusEvent";
import { WINSTON_MODULE_PROVIDER } from "nest-winston";

@Injectable()
export class DashboardEventHandler {
  @Inject(WINSTON_MODULE_PROVIDER)
  private readonly logger: Logger;

  @Inject("DashboardClient")
  private readonly dashboardClient: DashboardClient;

  @OnEvent(`dashboard.${NotificationEventType.SEND_REGISTER_NEW_EMPLOYEE_EVENT}`)
  public async sendRegisterNewEmployee(payload: SendRegisterNewEmployeeEvent) {
    await this.dashboardClient.registerNewEmployee({
      firstName: payload.firstName,
      lastName: payload.lastName,
      email: payload.email,
      phone: payload.phone,
      employerReferralID: payload.employerReferralID,
      allocationAmountInPesos: payload.allocationAmountInPesos,
      nobaEmployeeID: payload.nobaEmployeeID,
    });
  }

  @OnEvent(`dashboard.${NotificationEventType.SEND_UPDATE_EMPLOYEE_ALLOCATION_AMOUNT_EVENT}`)
  public async sendUpdateEmployeeAllocationAmount(payload: SendUpdateEmployeeAllocationAmontEvent) {
    await this.dashboardClient.updateEmployeeAllocationAmount(payload.nobaEmployeeID, payload.allocationAmountInPesos);
  }

  @OnEvent(`dashboard.${NotificationEventType.SEND_UPDATE_PAYROLL_STATUS_EVENT}`)
  public async sendUpdatePayrollStatus(payload: SendUpdatePayrollStatusEvent) {
    try {
      await this.dashboardClient.updatePayrollStatus(payload.payrollStatus, payload.nobaPayrollID);
    } catch (err) {
      this.logger.error(`Failed to update the payroll status in dasboard, ${JSON.stringify(err)}`);
    }
  }
}
