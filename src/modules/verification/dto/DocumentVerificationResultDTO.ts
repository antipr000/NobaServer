import { ApiProperty } from "@nestjs/swagger";
import { DocumentVerificationStatus } from "../../../modules/consumer/domain/VerificationStatus";

export class DocumentVerificationResultDTO {
  @ApiProperty({ enum: DocumentVerificationStatus })
  status: DocumentVerificationStatus;
}
