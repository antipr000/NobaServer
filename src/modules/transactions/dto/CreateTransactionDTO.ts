import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { TransactionType } from "../domain/Types";

export class CreateTransactionDTO {
  @ApiProperty()
  paymentMethodID: string;

  @ApiProperty({ enum: Object.values(TransactionType) })
  type: TransactionType;

  @ApiProperty()
  leg1: string;

  @ApiProperty()
  leg2: string;

  @ApiProperty()
  leg1Amount: number;

  @ApiProperty()
  leg2Amount: number;

  @ApiPropertyOptional()
  destinationWalletAddress?: string;
}
