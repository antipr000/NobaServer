import { ApiProperty } from "@nestjs/swagger";
import { Currency } from "../domain/TransactionTypes";

export class ExchangeRateDTO {
  @ApiProperty({ description: "currency that the exchange rate is being calculated from", enum: Currency })
  numeratorCurrency: string;

  @ApiProperty({ description: "currency that the exchange rate is being calculated to", enum: Currency })
  denominatorCurrency: string;

  @ApiProperty({ description: "actual exchange rate between the two currencies" })
  exchangeRate: string;
}
