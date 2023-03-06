import { PayrollStatus } from "../../../modules/employer/domain/Payroll";

export class SendUpdatePayrollStatusEvent {
  public readonly nobaPayrollID: string;
  public readonly payrollStatus: PayrollStatus;

  constructor({ nobaPayrollID, payrollStatus }: { nobaPayrollID: string; payrollStatus: PayrollStatus }) {
    this.nobaPayrollID = nobaPayrollID;
    this.payrollStatus = payrollStatus;
  }
}
