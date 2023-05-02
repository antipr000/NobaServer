import { EmployeeStatus } from "../../../modules/employee/domain/Employee";

export type RegisterEmployerRequest = {
  name: string;
  logoURI: string;
  locale?: string;
  referralID: string;
  bubbleID: string;
  leadDays?: number;
  maxAllocationPercent?: number;
  payrollAccountNumber?: string;
  payrollDates?: string[];
};

export type UpdateNobaEmployerRequest = {
  logoURI?: string;
  locale?: string;
  leadDays?: number;
  payrollDates?: string[];
  payrollAccountNumber?: string;
  maxAllocationPercent?: number;
};

export type UpdateNobaEmployeeRequest = {
  salary?: number;
  status?: EmployeeStatus;
};
