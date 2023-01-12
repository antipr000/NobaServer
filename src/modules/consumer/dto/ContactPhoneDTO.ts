import { ApiProperty } from "@nestjs/swagger";

export class ContactPhoneDTO {
  @ApiProperty()
  countryCode: string;

  @ApiProperty()
  digits: string;
}
