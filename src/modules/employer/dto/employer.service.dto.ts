export type CreateEmployerRequestDTO = {
  name: string;
  logoURI: string;
  referralID: string;
  documentNumber?: string;
  bubbleID: string;
  maxAllocationPercent?: number;
  leadDays?: number;
  payrollAccountNumber?: string;
  payrollDates?: string[];
};

export type UpdateEmployerRequestDTO = {
  name?: string;
  logoURI?: string;
  referralID?: string;
  documentNumber?: string;
  leadDays?: number;
  payrollAccountNumber?: string;
  payrollDates?: string[];
  maxAllocationPercent?: number;
};
