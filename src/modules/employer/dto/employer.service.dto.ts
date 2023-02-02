export type CreateEmployerRequestDTO = {
  name: string;
  logoURI: string;
  referralID: string;
  bubbleID: string;
  leadDays?: number;
  payrollDates?: string[];
};

export type UpdateEmployerRequestDTO = {
  logoURI?: string;
  referralID?: string;
  leadDays?: number;
  payrollDates?: string[];
};
