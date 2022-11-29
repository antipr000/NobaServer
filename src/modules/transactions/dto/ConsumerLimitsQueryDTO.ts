import { ApiProperty } from "@nestjs/swagger";
import { TransactionType } from "../domain/Types";

export class ConsumerLimitsQueryDTO {
  @ApiProperty({ enum: TransactionType })
  transactionType: TransactionType;
}
