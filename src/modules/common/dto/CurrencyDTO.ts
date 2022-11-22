import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";

export class CurrencyDTO {
  @ApiPropertyOptional()
  type?: string;

  @ApiPropertyOptional()
  provider?: string;

  @ApiProperty()
  name: string; // AAVE.ETH, for example

  @ApiProperty()
  ticker: string;

  @ApiProperty()
  iconPath: string;

  @ApiProperty()
  precision: number;

  spreadOverride?: number;
}
