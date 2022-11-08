import { ApiProperty } from "@nestjs/swagger";
import { AdminProps, NOBA_ADMIN_ROLE_TYPES } from "../domain/Admin";

export class AddNobaAdminDTO implements Partial<AdminProps> {
  @ApiProperty()
  email: string;

  @ApiProperty()
  name: string;

  @ApiProperty({ enum: NOBA_ADMIN_ROLE_TYPES })
  role: NOBA_ADMIN_ROLE_TYPES;
}
