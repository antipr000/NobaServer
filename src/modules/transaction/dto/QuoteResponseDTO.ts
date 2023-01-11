import { ApiProperty } from "@nestjs/swagger";

export class QuoteResponseDTO {
  @ApiProperty()
  quoteAmount: string;

  @ApiProperty()
  quoteAmountWithFees: string;

  @ApiProperty()
  exchangeRate: string;
}
