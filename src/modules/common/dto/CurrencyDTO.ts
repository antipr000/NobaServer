import { ApiProperty } from "@nestjs/swagger";

export class CurrencyDTO {
  type?: string;

  provider?: string;

  @ApiProperty()
  name: string; // AAVE.ETH, for example

  @ApiProperty()
  ticker: string;

  @ApiProperty()
  iconPath: string;

  @ApiProperty()
  precision: number;
}
