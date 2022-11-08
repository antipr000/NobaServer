import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { PARTNER_ADMIN_ROLE_TYPES } from "../../partner/domain/PartnerAdmin";

export class PartnerAdminDTO {
  @ApiProperty()
  _id: string;

  @ApiPropertyOptional()
  name: string;

  @ApiProperty()
  email: string;

  @ApiProperty()
  partnerID: string;

  @ApiProperty({ enum: PARTNER_ADMIN_ROLE_TYPES })
  role: PARTNER_ADMIN_ROLE_TYPES;
}
