import { ApiProperty } from "@nestjs/swagger";
import { CircleFundsMovementRequestDTO } from "./CircleFundsMovementRequestDTO";

export class CircleFundsTransferRequestDTO extends CircleFundsMovementRequestDTO {
  @ApiProperty({ description: "ID of the wallet to transfer funds from" })
  sourceWalletID: string;

  @ApiProperty({ description: "ID of the wallet to transfer funds to" })
  destinationWalletID: string;
}
