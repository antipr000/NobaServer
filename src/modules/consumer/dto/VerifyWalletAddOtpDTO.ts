import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";

export class VerifyWalletAddOtpDTO {
  @ApiProperty()
  emailOrPhone: string;

  @ApiProperty()
  otp: number;

  @ApiPropertyOptional()
  partnerID?: string;
}
