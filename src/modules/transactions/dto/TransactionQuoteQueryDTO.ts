import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { CurrencyType } from "../../common/domain/Types";

export class TransactionQuoteQueryDTO {
  @ApiProperty()
  fiatCurrencyCode: string;

  @ApiProperty()
  cryptoCurrencyCode: string;

  @ApiProperty({ enum: Object.values(CurrencyType) })
  fixedSide: CurrencyType;

  @ApiProperty()
  fixedAmount: number;

  @ApiPropertyOptional() // If not supplied, it will be added in the controller
  partnerID?: string;
}
