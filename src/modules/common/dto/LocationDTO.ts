import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";

export class SubdivisionDTO {
  @ApiProperty()
  code: string;

  @ApiProperty()
  name: string;

  @ApiProperty()
  supported?: boolean; // defaults to true. Set to false to indicate not supported.
}

export class LocationDTO {
  @ApiProperty()
  countryName: string;

  @ApiPropertyOptional()
  alternateCountryName?: string;

  @ApiProperty()
  countryISOCode: string;

  @ApiProperty()
  alpha3ISOCode: string;

  @ApiProperty()
  dialingPrefix: string;

  @ApiPropertyOptional({ type: [SubdivisionDTO] })
  subdivisions?: Array<SubdivisionDTO>;

  @ApiPropertyOptional()
  countryFlagIconPath?: string;
}
