import { ApiProperty } from "@nestjs/swagger";
import { CircleWithdrawalStatus } from "../../domain/CircleTypes";

export class CircleWalletResponseDTO {
  @ApiProperty()
  walletID: string;
}

export class CircleWalletBalanceResponseDTO {
  @ApiProperty()
  walletID: string;

  @ApiProperty()
  balance: number;
}

export class CircleTransactionDTO {
  @ApiProperty()
  id: string;

  @ApiProperty({ enum: CircleWithdrawalStatus })
  status: CircleWithdrawalStatus;

  @ApiProperty()
  createdAt: string;
}
