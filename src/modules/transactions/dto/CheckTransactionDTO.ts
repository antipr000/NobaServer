import { ApiProperty } from "@nestjs/swagger";
import { TransactionAllowedStatus } from "../domain/TransactionAllowedStatus";

export class CheckTransactionDTO {
  @ApiProperty({ enum: TransactionAllowedStatus })
  status: TransactionAllowedStatus;

  @ApiProperty()
  rangeMin: number;

  @ApiProperty()
  rangeMax: number;
}
