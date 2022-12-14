import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";

export class LoginResponseDTO {
  @ApiProperty()
  access_token: string;

  @ApiProperty()
  user_id: string;

  @ApiPropertyOptional()
  refresh_token: string;
}
