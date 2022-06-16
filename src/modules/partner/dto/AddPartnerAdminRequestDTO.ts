import { ApiProperty } from "@nestjs/swagger";

// TODO: Make the optional field mandatory after fixing the partner controller tests
export class AddPartnerAdminRequestDTO {
  @ApiProperty()
  email: string;

  @ApiProperty()
  name?: string;

  @ApiProperty()
  role?: string;
}
