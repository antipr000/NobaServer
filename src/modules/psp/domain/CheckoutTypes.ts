//https://api-reference.checkout.com/#operation/getPaymentDetails
export type CheckoutPaymentStatus =
  | "Pending"
  | "Authorized"
  | "Card Verified"
  | "Voided"
  | "Partially Captured"
  | "Captured"
  | "Partially Refunded"
  | "Refunded"
  | "Declined"
  | "Canceled"
  | "Expired"
  | "Paid";

// https://api-reference.checkout.com/#tag/Workflows/paths/~1workflows/get
export type WorkflowMetadata = {
  id: string;
  name: string;
  active: boolean;
  _links: any;
};

export type PaymentPendingWebhookData = {
  paymentID: string;
  amount: number;
  currency: string;
  processedOn: Date;
  idempotencyID: string;
};

export type PaymentCapturePendingWebhookData = {
  paymentID: string;
  actionID: string;
  amount: number;
  currency: string;
  processedOn: Date;
  idempotencyID: string;
};

export type PaymentCapturedWebhookData = {
  paymentID: string;
  actionID: string;
  amount: number;
  currency: string;
  processedOn: Date;
  idempotencyID: string;
  acquirerTransactionID: string;
  acquirerReferenceNumber: string;
};
