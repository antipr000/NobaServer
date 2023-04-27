export type CreateEmployerRequestDTO = {
  name: string;
  logoURI: string;
  locale?: string;
  referralID: string;
  bubbleID: string;
  maxAllocationPercent?: number;
  leadDays?: number;
  payrollAccountNumber?: string;
  payrollDates?: string[];
};

export type UpdateEmployerRequestDTO = {
  logoURI?: string;
  locale?: string;
  referralID?: string;
  leadDays?: number;
  payrollAccountNumber?: string;
  payrollDates?: string[];
  maxAllocationPercent?: number;
};
