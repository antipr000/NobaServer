import { KYCStatus, DocumentVerificationStatus } from "./VerificationStatus";

export enum VerificationProviders {
  SARDINE = "sardine",
}

export type VerificationData = {
  verificationProvider: VerificationProviders;
  kycVerificationStatus: KYCStatus;
  documentVerificationStatus: DocumentVerificationStatus;
  documentVerificationTransactionID?: string;
  idVerificationTimestamp?: number;
  documentVerificationTimestamp?: number;
};
