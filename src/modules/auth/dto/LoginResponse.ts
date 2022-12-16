import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";

export class LoginResponseDTO {
  @ApiProperty()
  accessToken: string;

  @ApiProperty()
  userID: string;

  @ApiPropertyOptional()
  refreshToken?: string;
}
