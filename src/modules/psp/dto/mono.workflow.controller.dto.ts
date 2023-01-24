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

export class MonoCreditRequestDTO {
  @ApiProperty()
  transactionID: string;

  @ApiProperty()
  amount: number;

  @ApiProperty()
  currency: string;

  // Eventually save bank account info in consumer
  @ApiProperty()
  bankAccountCode: string;

  @ApiProperty()
  bankAccountNumber: string;

  @ApiProperty()
  bankAccountType: string;

  // Eventually save bank document info in consumer
  @ApiProperty()
  documentNumber: string;

  @ApiProperty()
  documentType: string;
}
