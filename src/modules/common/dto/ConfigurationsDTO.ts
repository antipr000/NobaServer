import { ApiProperty } from "@nestjs/swagger";

export class ConfigurationsDTO {
  @ApiProperty()
  lowAmountThreshold: number;

  @ApiProperty()
  highAmountThreshold: number;

  @ApiProperty()
  cryptoImageBaseUrl: string;

  @ApiProperty()
  fiatImageBaseUrl: string;
}
