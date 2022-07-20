import { ApiProperty } from "@nestjs/swagger";
import { CurrencyType } from "../../common/domain/Types";

export class TransactionQuoteQueryDTO {
  @ApiProperty()
  fiatCurrencyCode: string;

  @ApiProperty()
  cryptoCurrencyCode: string;

  @ApiProperty({ enum: Object.values(CurrencyType) })
  fixedSide: CurrencyType;

  @ApiProperty()
  fixedAmount: number;
}
