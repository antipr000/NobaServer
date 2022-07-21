import { KYCStatus, DocumentVerificationStatus, RiskLevel } from "./VerificationStatus";

export enum VerificationProviders {
  SARDINE = "sardine",
}

export type VerificationData = {
  verificationProvider: VerificationProviders;
  kycVerificationStatus: KYCStatus;
  documentVerificationStatus: DocumentVerificationStatus;
  documentVerificationTransactionID?: string;
  kycVerificationTimestamp?: number;
  documentVerificationTimestamp?: number;
  sanctionLevel?: RiskLevel;
  pepLevel?: RiskLevel;
};
