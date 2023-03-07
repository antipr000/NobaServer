import { Payroll } from "../../../modules/employer/domain/Payroll";
import { PayrollDisbursement } from "../../../modules/employer/domain/PayrollDisbursement";

export type RegisterEmployerRequest = {
  name: string;
  logoURI: string;
  referralID: string;
  bubbleID: string;
  leadDays?: number;
  maxAllocationPercent?: number;
  payrollAccountNumber?: string;
  payrollDates?: string[];
};

export type UpdateNobaEmployerRequest = {
  logoURI?: string;
  leadDays?: number;
  payrollDates?: string[];
  payrollAccountNumber?: string;
  maxAllocationPercent?: number;
};

export type UpdateNobaEmployeeRequest = {
  salary: number;
};

export type PayrollWithDisbursements = Payroll & {
  disbursements: PayrollDisbursement[];
};
