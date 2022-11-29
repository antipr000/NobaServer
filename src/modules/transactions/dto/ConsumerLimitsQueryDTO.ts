import { ApiPropertyOptional } from "@nestjs/swagger";
import { TransactionType } from "../domain/Types";

export class ConsumerLimitsQueryDTO {
  // TODO(CRYPTO-393): Mark it as required
  @ApiPropertyOptional({ enum: TransactionType })
  transactionType?: TransactionType;
}
