import { ApiPropertyOptional } from "@nestjs/swagger";
import { Gender } from "../domain/ExternalStates";

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
  locale?: string;

  @ApiPropertyOptional({ enum: Gender })
  gender?: Gender;

  @ApiPropertyOptional()
  handle?: string;

  @ApiPropertyOptional()
  address?: UpdateAddressDTO;

  @ApiPropertyOptional()
  isDisabled?: boolean;

  @ApiPropertyOptional()
  referredByCode?: string;
}
