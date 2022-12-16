import { ApiProperty } from "@nestjs/swagger";

export class NewAccessTokenRequestDTO {
  @ApiProperty({ description: "userId of user who owns the refresh token" })
  userID: string;

  @ApiProperty({ description: "Refresh token to get new acess token" })
  refreshToken: string;
}
