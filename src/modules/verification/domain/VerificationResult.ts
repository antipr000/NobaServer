import {
  ConsumerVerificationStatus,
  DocumentVerificationStatus,
} from "../../../modules/user/domain/VerificationStatus";

export type ConsumerVerificationResult = {
  status: ConsumerVerificationStatus;
};

export type DocumentVerificationResult = {
  status: DocumentVerificationStatus;
};
