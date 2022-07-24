export enum PaymentMethodType {
  CARD = "Card",
}

export enum FiatTransactionStatus {
  PENDING = "Pending",
  CAPTURED = "Captured",
  FAILED = "Failed",
  REFUNDED = "Refunded",
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

export enum PendingTransactionValidationStatus {
  PASS = "Pass",
  FAIL = "Fail",
}
