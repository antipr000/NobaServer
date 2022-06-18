import { ApiProperty } from "@nestjs/swagger";

export class AddPartnerAdminRequestDTO {
  @ApiProperty()
  email: string;

  @ApiProperty()
  name: string;

  @ApiProperty()
  role: string;
}
