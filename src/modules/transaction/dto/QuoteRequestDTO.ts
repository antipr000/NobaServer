import { ApiProperty } from "@nestjs/swagger";
import { Currency } from "../domain/TransactionTypes";

export class QuoteRequestDTO {
  @ApiProperty()
  amount: number;

  @ApiProperty({ enum: Currency })
  currency: Currency;

  @ApiProperty({ enum: Currency })
  desiredCurrency: Currency;

  @ApiProperty()
  addFee: boolean;
}
