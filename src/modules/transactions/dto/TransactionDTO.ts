import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { TransactionStatus, TransactionType } from "../domain/Types";

export class TransactionDTO {
  @ApiProperty()
  _id: string;

  @ApiProperty()
  userID: string;

  @ApiProperty({ enum: Object.values(TransactionStatus) })
  status: TransactionStatus;

  @ApiProperty({ enum: Object.values(TransactionType) })
  type: TransactionType;

  @ApiPropertyOptional()
  statusMessage?: string;

  @ApiProperty()
  leg1: string;

  @ApiProperty()
  leg2: string;

  @ApiProperty({
    description:
      "Amount to be exchaged. in case of offramp it is amount of fiat currency, offramp amount of crypto, in case of swap the source currency etc.",
  })
  baseAmount: number;

  @ApiProperty()
  leg1Amount: number;

  @ApiProperty()
  leg2Amount: number;

  @ApiProperty()
  transactionTimestamp: Date;

  @ApiPropertyOptional()
  paymentMethodID?: string;

  @ApiPropertyOptional()
  fiatTransactionID?: string;

  @ApiPropertyOptional()
  cryptoTransactionID?: string;

  @ApiPropertyOptional({
    description: "Destination wallet address to transfer crypto to in case of off ramp transaction",
  })
  destinationWalletAddress?: string;
}
