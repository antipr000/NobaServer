import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { CircleTransferStatus } from "../../psp/domain/CircleTypes";

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

  @ApiProperty({ enum: CircleTransferStatus })
  status: CircleTransferStatus;

  @ApiProperty()
  createdAt: string;
}

export class GetCircleBalanceRequestDTO {
  @ApiPropertyOptional()
  forceRefresh?: boolean;
}
