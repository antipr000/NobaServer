import { ApiProperty } from "@nestjs/swagger";
import { CurrencyType } from "../../common/domain/Types";
import { TransactionType } from "@prisma/client";

export class TransactionQuoteQueryDTO {
  @ApiProperty()
  fiatCurrencyCode: string;

  @ApiProperty()
  cryptoCurrencyCode: string;

  @ApiProperty({ enum: Object.values(CurrencyType) })
  fixedSide: CurrencyType;

  @ApiProperty()
  fixedAmount: number;

  @ApiProperty({ enum: TransactionType })
  transactionType: TransactionType;
}
