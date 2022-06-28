import { ApiProperty } from "@nestjs/swagger";

export enum VerificationResultStatus {
  APPROVED = "Approved",
  NOT_APPROVED = "NotApproved",
  PENDING = "Pending",
}

export class VerificationResultDTO {
  @ApiProperty({ enum: VerificationResultStatus })
  status: VerificationResultStatus;
}
