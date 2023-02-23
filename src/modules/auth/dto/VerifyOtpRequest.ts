import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";

export class VerifyOtpRequestDTO {
  @ApiPropertyOptional({ description: "Email or phone value to identify the user" })
  emailOrPhone?: string;

  @ApiProperty({ description: "One-time password sent to email or phone" })
  otp: number;

  @ApiPropertyOptional({ description: "include refresh token to get new token on expiry of current access token" })
  includeRefreshToken?: boolean;
}

export class AdminVerifyOtpRequestDTO {
  @ApiPropertyOptional({ description: "Email or phone value to identify the user" })
  emailOrPhone?: string;

  @ApiProperty({ description: "One-time password sent to email or phone" })
  otp: number;
}
