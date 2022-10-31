export type PspPaymentResponse = {
  id: string;
  response_code: string;
  response_summary: string;
  risk: {
    flagged: boolean;
  };
  bin: string;
};
