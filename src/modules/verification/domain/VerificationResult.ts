import { KYCStatus, DocumentVerificationStatus } from "../../consumer/domain/VerificationStatus";

export type ConsumerVerificationResult = {
  status: KYCStatus;
};

export type DocumentVerificationResult = {
  status: DocumentVerificationStatus;
  riskRating?: string;
};
