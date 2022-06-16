import { ApiProperty } from "@nestjs/swagger";
import { AdminProps } from "../domain/Admin";

export class NobaAdminDTO implements Partial<AdminProps> {
  @ApiProperty()
  _id?: string;

  @ApiProperty()
  email: string;

  @ApiProperty()
  name: string;

  @ApiProperty()
  role: string;
}
