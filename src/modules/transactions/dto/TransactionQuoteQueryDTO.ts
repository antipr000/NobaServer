import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { CurrencyType } from "../../common/domain/Types";
import { TransactionType } from "../domain/Types";

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

  @ApiPropertyOptional() // If not supplied, it will be added in the controller
  partnerID?: string;
}
