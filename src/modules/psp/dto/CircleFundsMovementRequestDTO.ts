import { ApiProperty } from "@nestjs/swagger";

export class CircleFundsMovementRequestDTO {
  @ApiProperty({ description: "ID of the workflow" })
  workflowID: string;

  @ApiProperty({ description: "Amount to debit or credit" })
  amount: number;
}
