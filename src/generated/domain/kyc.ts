import { Consumer } from "./consumer";
import { KYCStatus, DocumentVerificationStatus } from "@prisma/client";

export class Kyc {
  id: number;

  kycCheckReference?: string;

  documentCheckReference?: string;

  riskRating?: string;

  isSuspectedFraud: boolean;

  kycCheckStatus: KYCStatus = KYCStatus.NOT_SUBMITTED;

  documentVerificationStatus: DocumentVerificationStatus = DocumentVerificationStatus.REQUIRED;

  documentVerificationTimestamp: Date;

  kycVerificationTimestamp: Date;

  sanctionLevel?: string;

  riskLevel?: string;

  consumer: Consumer;

  consumerID: string;
}
