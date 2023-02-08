import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { NationalIDTypes } from "../domain/NationalIDTypes";
export class AddressDTO {
  @ApiPropertyOptional()
  streetLine1?: string;

  @ApiPropertyOptional()
  streetLine2?: string;

  @ApiProperty()
  countryCode: string;

  @ApiPropertyOptional()
  city?: string;

  @ApiPropertyOptional({ description: "state code in ISO 3166-2" })
  regionCode?: string;

  @ApiPropertyOptional()
  postalCode?: string;
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

  @ApiProperty({ description: "Date of birth in format YYYY-MM-DD" })
  dateOfBirth: string;

  @ApiPropertyOptional()
  nationalID?: NationalIDDTO;
}
