import { CACHE_MANAGER, Inject, Injectable } from "@nestjs/common";
import { CurrencyDTO } from "./modules/common/dto/CurrencyDTO";
import { Cache } from "cache-manager";

@Injectable()
export class AppService {
  constructor(@Inject(CACHE_MANAGER) private cacheManager: Cache) {}

  async getSupportedCryptocurrencies(): Promise<Array<CurrencyDTO>> {
    // TODO(#235): Pull from database post-MVP
    return await this.cacheManager.get("cryptocurrencies");
  }

  async getSupportedFiatCurrencies(): Promise<CurrencyDTO[]> {
    // TODO(#235): Pull from database post-MVP
    return [
      {
        name: "US Dollar",
        ticker: "USD",
        iconPath: "https://dj61eezhizi5l.cloudfront.net/assets/images/currency-logos/fiat/usd.svg",
      },
    ];
  }
}
