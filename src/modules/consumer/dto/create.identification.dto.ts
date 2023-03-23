import { ApiProperty } from "@nestjs/swagger";

export class CreateIdentificationDTO {
  @ApiProperty()
  type: string;

  @ApiProperty()
  value: string;

  @ApiProperty()
  countryCode: string;
}
