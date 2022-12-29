import { ApiPropertyOptional } from "@nestjs/swagger";

export class UpdateAddressDTO {
  @ApiPropertyOptional()
  streetLine1?: string;

  @ApiPropertyOptional()
  streetLine2?: string;

  @ApiPropertyOptional()
  city?: string;

  @ApiPropertyOptional()
  countryCode?: string;

  @ApiPropertyOptional()
  regionCode?: string;

  @ApiPropertyOptional()
  postalCode?: string;
}

export class UpdateConsumerRequestDTO {
  @ApiPropertyOptional()
  firstName?: string;

  @ApiPropertyOptional()
  lastName?: string;

  @ApiPropertyOptional()
  dateOfBirth?: string;

  @ApiPropertyOptional()
  handle?: string;

  @ApiPropertyOptional()
  address?: UpdateAddressDTO;

  @ApiPropertyOptional()
  referredByHandle?: string;
}
