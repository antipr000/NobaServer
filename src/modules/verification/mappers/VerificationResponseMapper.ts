import { KYCStatus } from "../../consumer/domain/VerificationStatus";
import { ConsumerVerificationResult, DocumentVerificationResult } from "../domain/VerificationResult";
import { DocumentVerificationResultDTO } from "../dto/DocumentVerificationResultDTO";
import { VerificationResultDTO, VerificationResultStatus } from "../dto/VerificationResultDTO";

export class VerificationResponseMapper {
  toConsumerInformationResultDTO(t: ConsumerVerificationResult): VerificationResultDTO {
    if (t.status === KYCStatus.APPROVED) {
      return {
        status: VerificationResultStatus.APPROVED,
      };
    } else if (t.status === KYCStatus.REJECTED) {
      return {
        status: VerificationResultStatus.NOT_APPROVED,
      };
    } else {
      return {
        status: VerificationResultStatus.PENDING,
      };
    }
  }

  toDocumentResultDTO(t: DocumentVerificationResult): DocumentVerificationResultDTO {
    return {
      status: t.status,
    };
  }
}
