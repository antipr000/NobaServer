import { ApiProperty } from "@nestjs/swagger";
import { IdentificationTypeDTO } from "./identification.type.dto";

export class IdentificationTypeCountryDTO {
  @ApiProperty()
  countryCode: string;

  @ApiProperty({ type: [IdentificationTypeDTO] })
  identificationTypes: IdentificationTypeDTO[];
}
