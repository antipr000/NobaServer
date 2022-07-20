export enum PaymentMethodType {
  CARD = "Card",
}

export enum FiatTransactionStatus {
  PENDING = "PENDING",
  CAPTURED = "CAPTURED",
  FAILED = "FAILED",
  REFUNDED = "REFUNDED",
}

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

export enum VerificationStatusType {
  NOT_STARTED = "NotStarted",
  PENDING = "Pending",
  REJECTED = "Rejected",
  FLAGGED = "Flagged",
  VERIFIED = "Verified",
}
