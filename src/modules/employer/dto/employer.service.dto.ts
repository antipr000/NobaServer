export type CreateEmployerRequestDTO = {
  name: string;
  logoURI: string;
  referralID: string;
  bubbleID: string;
  leadDays?: number;
  payrollDays?: number[];
};

export type UpdateEmployerRequestDTO = {
  logoURI?: string;
  referralID?: string;
  leadDays?: number;
  payrollDays?: number[];
};
