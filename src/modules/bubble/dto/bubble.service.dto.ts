export type RegisterEmployerRequest = {
  name: string;
  logoURI: string;
  referralID: string;
  bubbleID: string;
  leadDays?: number;
  payrollDates?: string[];
};

export type UpdateNobaEmployerRequest = {
  logoURI?: string;
  leadDays?: number;
  payrollDates?: Date[];
};
