export type PspCardPaymentResponse = {
  id: string;
  response_code: string;
  response_summary: string;
  risk: {
    flagged: boolean;
  };
  bin: string;
};

export type PspACHPaymentResponse = {
  id: string;
  status: string;
  response_code: string;
};
