import { ApiProperty } from "@nestjs/swagger";

export class QuoteResponseDTO {
  // Return the following:
  // X Noba Exchange Rate
  // O Quote Before Fees
  // O Quote After Fees
  // O Processing Fee
  // O Noba Fee
  // O Total Fee

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
