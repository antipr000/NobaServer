import { ApiProperty } from "@nestjs/swagger";
import { CurrencyType } from "../../common/domain/Types";

export class TransactionQuoteDTO {
  @ApiProperty()
  fiatCurrencyCode: string;

  @ApiProperty()
  cryptoCurrencyCode: string;

  @ApiProperty({ enum: Object.values(CurrencyType) })
  fixedSide: CurrencyType;

  @ApiProperty()
  fixedAmount: number;

  @ApiProperty()
  quotedAmount: number;

  @ApiProperty()
  processingFee: number;

  @ApiProperty()
  networkFee: number;

  @ApiProperty()
  exchangeRate: number;
}
