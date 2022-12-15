import { PaymentMethodStatus } from "@prisma/client";

export enum PaymentMethodType {
  CARD = "Card",
}

export enum FiatTransactionStatus {
  AUTHORIZED = "Authorized",
  PENDING = "Pending",
  CAPTURED = "Captured",
  FAILED = "Failed",
  REFUNDED = "Refunded",
}

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

export type PaymentRequestResponse = {
  status: PaymentMethodStatus;
  paymentID?: string;
  responseCode?: string;
  responseSummary?: string;
};
