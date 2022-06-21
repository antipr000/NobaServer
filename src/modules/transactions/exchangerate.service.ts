import { Injectable } from "@nestjs/common";
import { ZeroHashService } from "./zerohash.service";

@Injectable()
export class ExchangeRateService {
  private readonly zeroHashService = new ZeroHashService();

  async priceInFiat(cryptoCurrency: string, fiatCurrency: string): Promise<number> {
    const zhQuote = await this.zeroHashService.requestQuote(cryptoCurrency, fiatCurrency, 1, "crypto");
    return zhQuote["message"]["price"];
  }

  async processingFee(cryptoCurrency: string, fiatCurrency: string, fiatAmount: number): Promise<number> {
    /**
     * Hardcoding this to 5% of amount
     * TODO: Add proper conversion here
     */
    return (5.0 * fiatAmount) / 100.0;
  }
}
