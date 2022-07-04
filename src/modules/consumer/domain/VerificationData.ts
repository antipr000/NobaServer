import { ConsumerVerificationStatus, DocumentVerificationStatus } from "./VerificationStatus";

export enum VerificationProviders {
  SARDINE = "sardine",
}

export type VerificationData = {
  verificationProvider: VerificationProviders;
  kycVerificationStatus: ConsumerVerificationStatus;
  documentVerificationStatus: DocumentVerificationStatus;
  documentVerificationTransactionID: string;
  idVerificationTimestamp?: number;
  documentVerificationTimestamp?: number;
};
