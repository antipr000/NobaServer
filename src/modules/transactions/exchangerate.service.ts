import { Injectable } from "@nestjs/common";
import { ZeroHashService } from "./zerohash.service";
import { ProcessingFeeDTO } from "./dto/ProcessingFeeDTO";

@Injectable()
export class ExchangeRateService {
  private readonly zeroHashService = new ZeroHashService();

  async priceInFiat(cryptoCurrency: string, fiatCurrency: string): Promise<number> {
    const zhQuote = await this.zeroHashService.requestQuote(cryptoCurrency, fiatCurrency, 1, "crypto");
    return zhQuote["message"]["price"];
  }

  async processingFee(cryptoCurrency: string, fiatCurrency: string, fiatAmount: number): Promise<ProcessingFeeDTO> {
    /**
     * Hardcoding this to 5% of amount
     * TODO: Add proper conversion here
     */
    return { processingPercentFee: 0.05, transactionPercentFee: 0.1 };
  }
}
