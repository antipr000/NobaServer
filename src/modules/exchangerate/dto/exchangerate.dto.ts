import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";

export class ExchangeRateDTO {
  @ApiProperty({
    description: "The currency that is being exchanged from",
  })
  numeratorCurrency: string;

  @ApiProperty({
    description: "The currency that is being exchanged to",
  })
  denominatorCurrency: string;

  @ApiProperty({
    description: "The exchange rate set by the bank, calculated as numerator/denominator",
  })
  bankRate: number;

  @ApiPropertyOptional({
    description:
      "The exchange rate set by Noba, calculated as numerator/denominator. If not set, will default to bankRate.",
  })
  nobaRate?: number;

  @ApiPropertyOptional({
    description: "The timestamp at which this exchange rate expires. If not set, will default to 24 hours from now.",
  })
  expirationTimestamp?: Date;
}
