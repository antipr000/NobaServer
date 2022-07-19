import { ApiProperty } from "@nestjs/swagger";

export class TransactionQuoteDTO {
  @ApiProperty()
  fiatCurrencyCode: string;

  @ApiProperty()
  cryptoCurrencyCode: string;

  @ApiProperty()
  fixedSide: string;

  @ApiProperty()
  fixedAmount: number;

  @ApiProperty()
  quotedAmount: number;

  @ApiProperty()
  processingFee: number;

  @ApiProperty()
  networkFee: number;
}
