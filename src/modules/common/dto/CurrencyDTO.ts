import { ApiProperty } from "@nestjs/swagger";
import { CurrencyType } from "../domain/Types";

export class CurrencyDTO {
  @ApiProperty()
  _id?: string; // TODO(#235): Will be populated when currencies are stored in the database

  @ApiProperty({ enum: Object.values(CurrencyType) })
  type?: string; // TODO(#235): Will be populated when currencies are stored in the database

  @ApiProperty()
  name: string;

  @ApiProperty()
  ticker: string;

  @ApiProperty()
  iconPath: string;
}
