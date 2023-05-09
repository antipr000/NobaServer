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
  documentNumber?: string;
  depositMatchingName?: string;
};

export type UpdateNobaEmployerRequest = {
  logoURI?: string;
  locale?: string;
  leadDays?: number;
  payrollDates?: string[];
  payrollAccountNumber?: string;
  maxAllocationPercent?: number;
  documentNumber?: string;
  depositMatchingName?: string;
};

export type UpdateNobaEmployeeRequest = {
  salary?: number;
  status?: EmployeeStatus;
};
