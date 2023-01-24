export type CreateEmployerRequestDTO = {
  name: string;
  logoURI: string;
  referralID: string;
  bubbleID: string;
  leadDays?: number;
  paymentSchedules?: number[];
};
