import { ApiPropertyOptional } from "@nestjs/swagger";

export class UpdatePartnerAdminRequestDTO {
  @ApiPropertyOptional()
  email: string;

  @ApiPropertyOptional()
  name: string;

  @ApiPropertyOptional()
  role: string;
}
