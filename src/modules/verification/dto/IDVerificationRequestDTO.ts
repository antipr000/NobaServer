import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { NationalID, DOB, IDRequest } from "../../../externalclients/idvproviders/definitions";
import { NationalIDTypes } from "../../../externalclients/idvproviders/definitions/NationalID";

class NationalIDDTO implements NationalID {
  @ApiProperty({ enum: NationalIDTypes })
  type: NationalIDTypes;

  @ApiProperty()
  number: string;

  @ApiPropertyOptional()
  mrz1?: string;

  @ApiPropertyOptional()
  mrz2?: string;

  @ApiPropertyOptional()
  dayOfExpiry?: number;

  @ApiPropertyOptional()
  monthOfExpiry?: number;

  @ApiPropertyOptional()
  yearOfExpiry?: number;

  @ApiPropertyOptional()
  state?: string;
}

class DOBDTO implements DOB {
  @ApiProperty()
  date: number;

  @ApiProperty()
  month: number;

  @ApiProperty()
  year: number;
}

export class IDVerificationRequestDTO implements IDRequest {
  @ApiProperty()
  firstName: string;

  @ApiProperty()
  lastName: string;

  @ApiProperty()
  dateOfBirth: DOBDTO;

  @ApiProperty()
  streetName: string;

  @ApiProperty()
  city: string;

  @ApiProperty()
  state: string;

  @ApiProperty()
  countryCode: string;

  @ApiProperty()
  postalCode: string;

  @ApiProperty()
  nationalID: NationalIDDTO;
}
