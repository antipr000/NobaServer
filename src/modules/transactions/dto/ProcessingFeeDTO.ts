import { ApiProperty } from "@nestjs/swagger";

export class ProcessingFeeDTO {
  @ApiProperty()
  processingPercentFee: number;

  @ApiProperty()
  transactionPercentFee: number;
}
