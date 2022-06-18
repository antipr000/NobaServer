import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";

export class PartnerAdminDTO {
  @ApiProperty()
  _id: string;

  @ApiPropertyOptional()
  name: string;

  @ApiProperty()
  email: string;

  @ApiProperty()
  partnerID: string;

  @ApiProperty()
  role: string;
}
