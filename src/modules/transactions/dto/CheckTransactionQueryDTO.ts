import { ApiProperty } from "@nestjs/swagger";
import { TransactionType } from "../domain/Types";

export class CheckTransactionQueryDTO {
  @ApiProperty({ enum: Object.values(TransactionType) })
  type: TransactionType;

  @ApiProperty()
  transactionAmount: number;

  @ApiProperty()
  baseCurrency: string;
}
