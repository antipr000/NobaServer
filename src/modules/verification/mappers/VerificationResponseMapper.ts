import {
  ConsumerVerificationStatus,
  DocumentVerificationStatus,
} from "../../../modules/user/domain/VerificationStatus";
import { ConsumerVerificationResult, DocumentVerificationResult } from "../domain/VerificationResult";
import { VerificationResultDTO, VerificationResultStatus } from "../dto/VerificationResultDTO";

export class VerificationResponseMapper {
  toConsumerInformationResultDTO(t: ConsumerVerificationResult): VerificationResultDTO {
    if (t.status === ConsumerVerificationStatus.PENDING_KYC_APPROVED) {
      return {
        status: VerificationResultStatus.APPROVED,
      };
    } else if (t.status === ConsumerVerificationStatus.NOT_APPROVED_REJECTED_KYC) {
      return {
        status: VerificationResultStatus.NOT_APPROVED,
      };
    } else {
      return {
        status: VerificationResultStatus.PENDING,
      };
    }
  }

  toDocumentResultDTO(t: DocumentVerificationResult): VerificationResultDTO {
    if (
      t.status === DocumentVerificationStatus.LIVE_PHOTO_VERIFIED ||
      t.status === DocumentVerificationStatus.VERIFIED
    ) {
      return {
        status: VerificationResultStatus.APPROVED,
      };
    } else if (t.status === DocumentVerificationStatus.REJECTED) {
      return {
        status: VerificationResultStatus.NOT_APPROVED,
      };
    } else {
      return {
        status: VerificationResultStatus.PENDING,
      };
    }
  }
}
