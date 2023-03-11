export type CreateEmployerRequestDTO = {
  name: string;
  logoURI: string;
  referralID: string;
  bubbleID: string;
  maxAllocationPercent?: number;
  leadDays?: number;
  payrollAccountNumber?: string;
  payrollDates?: string[];
};

export type UpdateEmployerRequestDTO = {
  logoURI?: string;
  referralID?: string;
  leadDays?: number;
  payrollAccountNumber?: string;
  payrollDates?: string[];
  maxAllocationPercent?: number;
};
