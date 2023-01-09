import { ApiPropertyOptional } from "@nestjs/swagger";
import { TransactionType } from "@prisma/client";

export class ConsumerLimitsQueryDTO {
  // TODO(CRYPTO-393): Mark it as required
  @ApiPropertyOptional({ enum: TransactionType })
  transactionType?: TransactionType;
}
