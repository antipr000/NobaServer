export type RegisterEmployerRequest = {
  name: string;
  logoURI: string;
  referralID: string;
  bubbleID: string;
  leadDays?: number;
  payrollDays?: number[];
};

export type UpdateNobaEmployerRequest = {
  logoURI?: string;
  leadDays?: number;
  payrollDays?: number[];
};