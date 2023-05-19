import { ApiProperty } from "@nestjs/swagger";
import { CircleTransferStatus } from "../../../modules/psp/domain/CircleTypes";

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

export class CircleTransferCheckResponseDTO {
  @ApiProperty({ enum: CircleTransferStatus })
  status: CircleTransferStatus;
}
