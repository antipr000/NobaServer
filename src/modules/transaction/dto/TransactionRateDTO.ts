import { ApiProperty } from "@nestjs/swagger";
import { Currency } from "../domain/TransactionTypes";

export class TransactionRateDTO {
  @ApiProperty({ description: "currency that the exchange rate is being calculated from", enum: Currency })
  baseCurrency: string;

  @ApiProperty({ description: "currency that the exchange rate is being calculated to", enum: Currency })
  targetCurrency: string;

  @ApiProperty({ description: "actual exchange rate between the two currencies" })
  exchangeRate: number;
}
