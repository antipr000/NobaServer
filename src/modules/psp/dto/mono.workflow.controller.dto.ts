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
