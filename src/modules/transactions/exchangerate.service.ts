import { BadRequestException, Injectable } from "@nestjs/common";
import { ZeroHashService } from "./zerohash.service";
import { ProcessingFeeDTO } from "./dto/ProcessingFeeDTO";
import { AppService } from "../../app.service";
import { CurrencyType } from "../common/domain/Types";

@Injectable()
export class ExchangeRateService {
  constructor(private readonly zeroHashService: ZeroHashService, private readonly appService: AppService) {}

  async priceInFiat(cryptoCurrency: string, fiatCurrency: string, cryptoAmount = 1): Promise<number> {
    /*
    Note: Even though the subsequent getQuote() method validates the currencies, the e2e tests fail
    if we don't check it here. Something to dig into later.
    */

    // Validate fiat currency
    /* const fiatCurrencies = await this.appService.getSupportedFiatCurrencies();
    if (fiatCurrencies.filter(curr => curr.ticker === fiatCurrency).length == 0) {
      throw new BadRequestException(`Unknown fiat currency: ${fiatCurrency}`);
    }

    // Validate cryptocurrency
    const cryptoCurrencies = await this.appService.getSupportedCryptocurrencies();
    if (cryptoCurrencies.filter(curr => curr.ticker === cryptoCurrency).length == 0) {
      throw new BadRequestException(`Unknown cryptocurrency: ${cryptoCurrency}`);
    }*/

    const quote = await this.getQuote(cryptoCurrency, fiatCurrency, cryptoAmount);
    return quote["price"];
  }

  async getQuote(
    cryptoCurrency: string,
    fiatCurrency: string,
    cryptoAmount = 1,
    amountType: CurrencyType = CurrencyType.CRYPTO,
  ): Promise<any> {
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

    const zhQuote = await this.zeroHashService.requestQuote(cryptoCurrency, fiatCurrency, cryptoAmount, amountType);
    return zhQuote["message"];
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
