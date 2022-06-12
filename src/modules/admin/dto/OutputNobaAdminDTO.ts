import { ApiProperty } from "@nestjs/swagger";
import { AdminProps } from "../domain/Admin";

export class OutputNobaAdminDTO implements Partial<AdminProps> {
  @ApiProperty()
  email: string;

  @ApiProperty()
  name: string;

  @ApiProperty()
  role: string;

  @ApiProperty()
  _id: string;
}
