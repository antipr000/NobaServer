import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import {
  DocumentVerificationErrorReason,
  DocumentVerificationState,
} from "../../../modules/consumer/domain/ExternalStates";

export class DocumentVerificationResultDTO {
  @ApiProperty({ enum: DocumentVerificationState })
  status: DocumentVerificationState;

  @ApiPropertyOptional({ enum: DocumentVerificationErrorReason })
  errorReason?: DocumentVerificationErrorReason;
}
