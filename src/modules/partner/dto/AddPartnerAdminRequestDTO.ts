import { ApiProperty } from "@nestjs/swagger";
import { PARTNER_ADMIN_ROLE_TYPES } from "../../partner/domain/PartnerAdmin";

export class AddPartnerAdminRequestDTO {
  @ApiProperty()
  email: string;

  @ApiProperty()
  name: string;

  @ApiProperty({ enum: PARTNER_ADMIN_ROLE_TYPES })
  role: PARTNER_ADMIN_ROLE_TYPES;
}
