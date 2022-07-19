import { ApiProperty } from "@nestjs/swagger";

export class TransactionQuoteQueryDTO {
  @ApiProperty()
  fiatCurrencyCode: string;

  @ApiProperty()
  cryptoCurrencyCode: string;

  @ApiProperty()
  fixedSide: string;

  @ApiProperty()
  fixedAmount: number;
}
