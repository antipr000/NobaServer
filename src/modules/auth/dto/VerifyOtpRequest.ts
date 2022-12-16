import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { allIdentities } from "../domain/IdentityType";

export class VerifyOtpRequestDTO {
  @ApiPropertyOptional({ description: "Email or phone value to identify the user" })
  emailOrPhone?: string;

  @ApiProperty({ enum: allIdentities, description: "Identity type of the user logging in" })
  identityType: string;

  @ApiProperty({ description: "One-time password sent to email or phone" })
  otp: number;

  @ApiPropertyOptional({ description: "include refresh token to get new token on expiry of current access token" })
  includeRefreshToken?: boolean;
}
