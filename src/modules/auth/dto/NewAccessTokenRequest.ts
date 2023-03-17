import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";

export class NewAccessTokenRequestDTO {
  @ApiProperty({ description: "ID of user who owns the refresh token" })
  userID: string;

  @ApiProperty({ description: "Refresh token to get new access token" })
  refreshToken: string;

  @ApiPropertyOptional({ description: "Session key, if known" })
  sessionKey?: string;
}
