import { ApiProperty } from "@nestjs/swagger";
import {
  DocumentVerificationErrorCodes,
  DocumentVerificationSardineResponse,
  DocumentVerificationWebhookRequest,
  SardineDocumentProcessingStatus,
  SardineRiskLevels,
} from "../integrations/SardineTypeDefinitions";

import { CaseDTO, ActionDTO } from "./WebhookCommonDTO";

export class DocumentDataDTO {
  @ApiProperty()
  type: string;

  @ApiProperty()
  number: string;

  @ApiProperty()
  dateOfBirth: string;

  @ApiProperty()
  dateOfIssue: string;

  @ApiProperty()
  dateOfExpiry: string;

  @ApiProperty()
  issuingCountry: string;

  @ApiProperty()
  firstName: string;

  @ApiProperty()
  middleName: string;

  @ApiProperty()
  lastName: string;

  @ApiProperty()
  gender: string;

  @ApiProperty()
  address: string;
}

export class VerificationInfoDTO {
  @ApiProperty({ enum: SardineRiskLevels })
  riskLevel: SardineRiskLevels;

  @ApiProperty({ enum: SardineRiskLevels })
  forgeryLevel: SardineRiskLevels;

  @ApiProperty({ enum: SardineRiskLevels })
  documentMatchLevel: SardineRiskLevels;

  @ApiProperty()
  imageQualityLevel: string;

  @ApiProperty()
  faceMatchLevel: string;

  @ApiProperty()
  reasonCodes: string[];
}

export class DocumentVerificationSardineResponseDTO implements DocumentVerificationSardineResponse {
  @ApiProperty()
  verificationId: string;

  @ApiProperty({ enum: SardineDocumentProcessingStatus })
  status: SardineDocumentProcessingStatus;

  @ApiProperty()
  documentData: DocumentDataDTO;

  @ApiProperty()
  verification: VerificationInfoDTO;

  @ApiProperty()
  errorCodes: DocumentVerificationErrorCodes[];
}

export class DataDTO {
  @ApiProperty()
  action: ActionDTO;

  @ApiProperty()
  case: CaseDTO;

  @ApiProperty()
  documentVerificationResult: DocumentVerificationSardineResponse;
}

export class DocumentVerificationWebhookRequestDTO implements DocumentVerificationWebhookRequest {
  @ApiProperty()
  id: string;

  @ApiProperty()
  type: string;

  @ApiProperty()
  timestamp: string;

  @ApiProperty()
  data: DataDTO;
}
