import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";

export class SubdivisionDTO {
  @ApiProperty()
  code: string;

  @ApiProperty()
  name: string;
}

export class LocationDTO {
  @ApiProperty()
  countryName: string;

  @ApiPropertyOptional()
  alternateCountryName?: string;

  @ApiProperty()
  countryISOCode: string;

  @ApiPropertyOptional({ type: Map<string, SubdivisionDTO> })
  subdivisions?: Map<string, SubdivisionDTO>;

  @ApiPropertyOptional()
  countryFlagIconPath?: string;
}