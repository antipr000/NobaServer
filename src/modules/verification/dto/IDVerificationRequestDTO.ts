import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { NationalIDTypes } from "../domain/NationalIDTypes";
export class AddressDTO {
  @ApiProperty()
  streetLine1: string;

  @ApiPropertyOptional()
  streetLine2?: string;

  @ApiProperty()
  countryCode: string;

  @ApiProperty()
  city: string;

  @ApiProperty({ description: "state code in ISO 3166-2" })
  regionCode: string;

  @ApiProperty()
  postalCode: string;
}

export class NationalIDDTO {
  @ApiProperty({ enum: NationalIDTypes })
  type: NationalIDTypes;

  @ApiProperty()
  number: string;
}

export class IDVerificationRequestDTO {
  @ApiProperty()
  firstName: string;

  @ApiProperty()
  lastName: string;

  @ApiProperty()
  address: AddressDTO;

  @ApiProperty()
  phoneNumber: string;

  @ApiProperty({ description: "Date of birth in format YYYY-MM-DD" })
  dateOfBirth: string;

  @ApiPropertyOptional()
  nationalID?: NationalIDDTO;
}
