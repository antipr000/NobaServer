import { DocumentVerificationStatus, KYCStatus } from "@prisma/client";
import { StatesMapper } from "../../../modules/consumer/mappers/StatesMapper";
import { ConsumerVerificationResult, DocumentVerificationResult } from "../domain/VerificationResult";
import { DocumentVerificationResultDTO } from "../dto/DocumentVerificationResultDTO";
import { VerificationResultDTO } from "../dto/VerificationResultDTO";

export class VerificationResponseMapper {
  private readonly statesMapper: StatesMapper;

  constructor() {
    this.statesMapper = new StatesMapper();
  }

  toConsumerInformationResultDTO(status: KYCStatus): VerificationResultDTO {
    return {
      status: this.statesMapper.getKycVerificationState(status),
    };
  }

  toDocumentResultDTO(status: DocumentVerificationStatus): DocumentVerificationResultDTO {
    const [state, errorReason] = this.statesMapper.getDocumentVerificationState(status);
    return {
      status: state,
      errorReason,
    };
  }
}
