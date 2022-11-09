import { ApiProperty } from "@nestjs/swagger";
import { KycVerificationState } from "../../../modules/consumer/domain/ExternalStates";

export class VerificationResultDTO {
  @ApiProperty({ enum: KycVerificationState })
  status: KycVerificationState;
}
