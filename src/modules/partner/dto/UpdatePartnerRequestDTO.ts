import { ApiPropertyOptional } from "@nestjs/swagger";

export class UpdatePartnerRequestDTO {
  @ApiPropertyOptional()
  name?: string;

  @ApiPropertyOptional()
  role?: string;

  @ApiPropertyOptional()
  takeRate?: number;
}
