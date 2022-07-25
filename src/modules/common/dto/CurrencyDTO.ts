import { ApiProperty } from "@nestjs/swagger";

export class CurrencyDTO {
  _id?: string; // TODO(#235): Will be populated when currencies are stored in the database

  type?: string; // TODO(#235): Will be populated when currencies are stored in the database

  @ApiProperty()
  name: string; // AAVE.ETH, for example

  @ApiProperty()
  ticker: string;

  @ApiProperty()
  iconPath: string;
}
