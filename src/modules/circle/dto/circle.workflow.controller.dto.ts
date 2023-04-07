import { ApiProperty } from "@nestjs/swagger";

export class CircleDepositOrWithdrawalRequest {
  @ApiProperty({ description: "ID of the workflow" })
  workflowID: string;

  @ApiProperty({ description: "Amount to debit or credit" })
  amount: number;
}

export class CircleFundsTransferRequestDTO extends CircleDepositOrWithdrawalRequest {
  @ApiProperty({ description: "ID of the wallet to transfer funds to" })
  destinationWalletID: string;
}
