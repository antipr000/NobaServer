import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { TransactionStatus } from "../domain/Types";

export class TransactionDTO {
  @ApiProperty()
  _id: string;

  @ApiProperty({ enum: Object.values(TransactionStatus) })
  status: TransactionStatus;

  @ApiPropertyOptional()
  statusMessage?: string;

  @ApiProperty()
  leg1: string;

  @ApiProperty()
  leg2: string;

  @ApiProperty()
  leg1Amount: number;

  @ApiProperty()
  leg2Amount: number;

  @ApiProperty()
  transactionTimestamp: Date;

  @ApiPropertyOptional()
  paymentMethodId?: string;

  @ApiPropertyOptional()
  fiatTransactionId?: string;

  @ApiPropertyOptional()
  cryptoTransactionId?: string;

  @ApiPropertyOptional()
  sourceWalletAdress?: string;

  @ApiPropertyOptional()
  destinationWalletAdress?: string;
}
