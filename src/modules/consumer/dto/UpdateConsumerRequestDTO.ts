import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { ConsumerProps } from "../domain/Consumer";

export class UpdateAddressDTO {
  @ApiProperty()
  streetLine1: string;

  @ApiPropertyOptional()
  streetLine2?: string;

  @ApiProperty()
  city: string;

  @ApiProperty()
  countryCode: string;

  @ApiProperty()
  regionCode: string;

  @ApiProperty()
  postalCode: string;
}

export class UpdateConsumerRequestDTO implements Partial<ConsumerProps> {
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
}
