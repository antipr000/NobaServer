import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { MonoTransactionState } from "../domain/Mono";

export class MonoTransactionDTO {
  @ApiProperty()
  id: string;

  @ApiProperty()
  nobaTransactionID: string;

  @ApiPropertyOptional()
  monoTransactionID?: string;

  @ApiProperty({ enum: Object.keys(MonoTransactionState) })
  state: MonoTransactionState;

  @ApiProperty()
  collectionLinkID: string;

  @ApiProperty()
  createdTimestamp: Date;

  @ApiProperty()
  updatedTimestamp: Date;
}

export class MonoDebitRequestDTO {
  @ApiProperty()
  transactionID: string;

  @ApiProperty()
  transactionRef: string;

  @ApiProperty()
  amount: number;

  @ApiProperty()
  currency: string;
}
