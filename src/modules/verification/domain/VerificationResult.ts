import { ConsumerVerificationStatus, DocumentVerificationStatus } from "../../consumer/domain/VerificationStatus";

export type ConsumerVerificationResult = {
  status: ConsumerVerificationStatus;
};

export type DocumentVerificationResult = {
  status: DocumentVerificationStatus;
  riskRating?: string;
};
