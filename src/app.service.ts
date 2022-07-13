import { Injectable } from "@nestjs/common";
import { CurrencyService } from "./modules/common/currency.service";
import { CurrencyDTO } from "./modules/common/dto/CurrencyDTO";

@Injectable()
export class AppService {
  constructor(private readonly currencyService: CurrencyService) {}

  async getSupportedCryptocurrencies(): Promise<Array<CurrencyDTO>> {
    // TODO(#235): Pull from database post-MVP
    return this.currencyService.getSupportedCryptocurrencies();
  }

  async getSupportedFiatCurrencies(): Promise<CurrencyDTO[]> {
    // TODO(#235): Pull from database post-MVP
    return this.currencyService.getSupportedFiatCurrencies();
  }
}
