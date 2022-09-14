export type EllipticTransactionAnalysisRequest = {
  subject: {
    asset: string;
    blockchain: string;
    type: string;
    hash: string;
    output_type: string;
    output_address: string;
  };
  type: string;
  customer_reference: string;
};

export type EllipticTransactionAnalysisResponse = {
  id: string;
  type: string;
  analysed_at: string;
  risk_score: number;
  predictive: boolean;
  customer: {
    id: string;
    reference: string;
  };
  blockchain_info: {
    address: {
      has_sent: boolean;
      has_received: boolean;
    };
    value: number;
  };
  process_status: string;
};
