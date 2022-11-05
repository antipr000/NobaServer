import { ApiPropertyOptional } from "@nestjs/swagger";
import { PARTNER_ADMIN_ROLE_TYPES } from "../domain/PartnerAdmin";

export class UpdatePartnerAdminRequestDTO {
  @ApiPropertyOptional()
  email?: string;

  @ApiPropertyOptional()
  name?: string;

  @ApiPropertyOptional({ enum: PARTNER_ADMIN_ROLE_TYPES })
  role?: PARTNER_ADMIN_ROLE_TYPES;
}
