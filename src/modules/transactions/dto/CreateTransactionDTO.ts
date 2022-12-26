import { ApiProperty } from "@nestjs/swagger";
import { TransactionType } from "@prisma/client";
import { CurrencyType } from "../../common/domain/Types";

export class CreateTransactionDTO {
  @ApiProperty()
  paymentToken: string;

  @ApiProperty({ enum: Object.values(TransactionType) })
  type: TransactionType;

  @ApiProperty()
  leg1: string;

  @ApiProperty()
  leg2: string;

  @ApiProperty()
  leg1Amount: number;

  @ApiProperty()
  leg2Amount: number;

  @ApiProperty({ enum: Object.values(CurrencyType) })
  fixedSide: CurrencyType;

  @ApiProperty()
  destinationWalletAddress: string;
}
