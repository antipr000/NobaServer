import { ApiProperty } from "@nestjs/swagger";
import { AdminProps } from "../domain/Admin";

export class AddNobaAdminDTO implements Partial<AdminProps> {
  @ApiProperty()
  email: string;

  @ApiProperty()
  name: string;

  @ApiProperty()
  role: string;
}
