import { ApiProperty } from "@nestjs/swagger";

export class IdentificationDTO {
  @ApiProperty()
  id: string;

  @ApiProperty()
  type: string;

  @ApiProperty()
  value: string;

  @ApiProperty()
  countryCode: string;

  @ApiProperty()
  consumerID: string;

  @ApiProperty()
  createdTimestamp: Date;
}
