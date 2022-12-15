import { ApiProperty } from "@nestjs/swagger";

export class CircleFundsMovementRequestDTO {
  @ApiProperty({ description: "Amount to debit or credit" })
  amount: number;
}
