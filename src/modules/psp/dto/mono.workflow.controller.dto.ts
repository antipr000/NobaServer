import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { MonoTransactionState, MonoTransactionType } from "../domain/Mono";

export class MonoCollectionLinkDepositsDTO {
  @ApiProperty()
  collectionLinkID: string;

  @ApiPropertyOptional()
  monoPaymentTransactionID?: string;
}

export class MonoWithdrawalsDTO {
  @ApiProperty()
  transferID: string;

  @ApiProperty()
  batchID: string;

  @ApiPropertyOptional()
  declinationReason?: string;
}

export class MonoTransactionDTO {
  @ApiProperty()
  id: string;

  @ApiProperty()
  nobaTransactionID: string;

  @ApiProperty({ enum: Object.keys(MonoTransactionType) })
  type: MonoTransactionType;

  @ApiProperty({ enum: Object.keys(MonoTransactionState) })
  state: MonoTransactionState;

  @ApiPropertyOptional()
  collectionLinkDepositDetails?: MonoCollectionLinkDepositsDTO;

  @ApiPropertyOptional()
  withdrawalDetails?: MonoWithdrawalsDTO;

  @ApiProperty()
  createdTimestamp: Date;

  @ApiProperty()
  updatedTimestamp: Date;
}

export class MonoDebitRequestDTO {
  @ApiProperty()
  transactionID: string;

  @ApiProperty()
  amount: number;

  @ApiProperty()
  currency: string;
}
