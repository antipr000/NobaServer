import { StatesMapper } from "../../../modules/consumer/mappers/StatesMapper";
import { ConsumerVerificationResult, DocumentVerificationResult } from "../domain/VerificationResult";
import { DocumentVerificationResultDTO } from "../dto/DocumentVerificationResultDTO";
import { VerificationResultDTO } from "../dto/VerificationResultDTO";

export class VerificationResponseMapper {
  private readonly statesMapper: StatesMapper;

  constructor() {
    this.statesMapper = new StatesMapper();
  }

  toConsumerInformationResultDTO(t: ConsumerVerificationResult): VerificationResultDTO {
    return {
      status: this.statesMapper.getKycVerificationState(t.status),
    };
  }

  toDocumentResultDTO(t: DocumentVerificationResult): DocumentVerificationResultDTO {
    const [status, errorReason] = this.statesMapper.getDocumentVerificationState(t.status);
    return {
      status,
      errorReason,
    };
  }
}
