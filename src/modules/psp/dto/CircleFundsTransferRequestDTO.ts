import { ApiProperty } from "@nestjs/swagger";
import { CircleDepositOrWithdrawalRequest } from "./CircleDepositOrWithdrawalRequest";

export class CircleFundsTransferRequestDTO extends CircleDepositOrWithdrawalRequest {
  @ApiProperty({ description: "ID of the wallet to transfer funds to" })
  destinationWalletID: string;
}
