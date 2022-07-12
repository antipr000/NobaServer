import { BadRequestException, Injectable } from "@nestjs/common";
import { ZeroHashService } from "./zerohash.service";
import { ProcessingFeeDTO } from "./dto/ProcessingFeeDTO";
import { AppService } from "../../app.service";

@Injectable()
export class ExchangeRateService {
  constructor(private readonly zeroHashService: ZeroHashService, private readonly appService: AppService) {}

  async priceInFiat(cryptoCurrency: string, fiatCurrency: string): Promise<number> {
    // Validate fiat currency
    console.log("Checking against supported fiats");
    const fiatCurrencies = await this.appService.getSupportedFiatCurrencies();
    if (fiatCurrencies.filter(curr => curr.ticker === fiatCurrency).length == 0) {
      throw new BadRequestException(`Unknown fiat currency: ${fiatCurrency}`);
    }

    // Validate cryptocurrency
    const cryptoCurrencies = await this.appService.getSupportedCryptocurrencies();
    if (cryptoCurrencies.filter(curr => curr.ticker === cryptoCurrency).length == 0) {
      throw new BadRequestException(`Unknown cryptocurrency: ${cryptoCurrency}`);
    }

    const zhQuote = await this.zeroHashService.requestQuote(cryptoCurrency, fiatCurrency, 1, "crypto");
    return zhQuote["message"]["price"];
  }

  async processingFee(cryptoCurrency: string, fiatCurrency: string, fiatAmount: number): Promise<ProcessingFeeDTO> {
    // Validate fiat currency
    const fiatCurrencies = await this.appService.getSupportedFiatCurrencies();
    if (fiatCurrencies.filter(curr => curr.ticker === fiatCurrency).length == 0) {
      throw new BadRequestException(`Unknown fiat currency: ${fiatCurrency}`);
    }

    // Validate cryptocurrency
    const cryptoCurrencies = await this.appService.getSupportedCryptocurrencies();
    if (cryptoCurrencies.filter(curr => curr.ticker === cryptoCurrency).length == 0) {
      throw new BadRequestException(`Unknown cryptocurrency: ${cryptoCurrency}`);
    }

    // Validate amount
    if (fiatAmount <= 0) {
      throw new BadRequestException(`Invalid fiat amount: ${fiatAmount}`);
    }

    /**
     * Hardcoding this to 5% of amount
     * TODO: Add proper conversion here
     */
    return { processingPercentFee: 0.05, transactionPercentFee: 0.1 };
  }
}
