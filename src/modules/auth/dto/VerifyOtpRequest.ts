import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { allIdentities } from "../domain/IdentityType";

export class VerifyOtpRequestDTO {
  @ApiProperty()
  emailOrPhone: string;

  @ApiProperty()
  otp: number;

  @ApiProperty({ enum: allIdentities })
  identityType: string;

  @ApiPropertyOptional()
  partnerID?: string;
}
