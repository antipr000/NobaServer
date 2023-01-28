import { ApiProperty } from "@nestjs/swagger";

export class QuoteResponseDTO {
  @ApiProperty()
  quoteAmount: string;

  @ApiProperty()
  quoteAmountWithFees: string;

  @ApiProperty()
  nobaRate: string;

  @ApiProperty()
  processingFee: string;

  @ApiProperty()
  nobaFee: string;

  @ApiProperty()
  totalFee: string;
}
