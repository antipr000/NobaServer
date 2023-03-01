export type CreateEmployerRequestDTO = {
  name: string;
  logoURI: string;
  referralID: string;
  bubbleID: string;
  maxAllocationPercent?: number;
  leadDays?: number;
  payrollDates?: string[];
};

export type UpdateEmployerRequestDTO = {
  logoURI?: string;
  referralID?: string;
  leadDays?: number;
  payrollDates?: string[];
  maxAllocationPercent?: number;
};

export type EmployeeDibursementDTO = {
  employeeName: string;
  amount: number;
};
