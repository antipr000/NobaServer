import { Injectable } from "@nestjs/common";
import { parse } from "csv";
import { createReadStream } from "fs";
import * as path from "path";
import { SUPPORTED_CRYPTO_TOKENS_FILE_PATH } from "../../config/ConfigurationUtils";
import { CustomConfigService } from "../../core/utils/AppConfigModule";
import { CurrencyDTO } from "../../modules/common/dto/CurrencyDTO";

@Injectable()
export class CurrencyService {
  private currencies: Array<CurrencyDTO>;
  private isCurrenciesLoaded: boolean;

  constructor(private readonly configService: CustomConfigService) {
    this.isCurrenciesLoaded = false;
    this.currencies = [];
  }

  private async loadCurrenciesFromFile(): Promise<Array<CurrencyDTO>> {
    return new Promise((resolve, reject) => {
      const results = new Array<CurrencyDTO>();
      const parser = parse({ delimiter: ",", columns: true });

      createReadStream(path.resolve(this.configService.get(SUPPORTED_CRYPTO_TOKENS_FILE_PATH)))
        .pipe(parser)
        .on("data", data => {
          const name = `${data["Name"]}`.trim();
          const symbol = `${data["Symbol (Prod)"]}`.trim();
          const liq = `${data["Liquidity**"]}`.trim();

          // Include only records for which ZH provides liquidity services (Liquidity=Yes)
          // Exclude XRP
          if ((liq === "Yes" && symbol !== "XRP") || symbol === "USDC.POLYGON") {
            // TODO: Move this path to config
            const curr = new CurrencyDTO();
            curr.name = `${name}`;
            curr.ticker = `${symbol}`;
            curr.iconPath = `https://dj61eezhizi5l.cloudfront.net/assets/images/currency-logos/crypto/${symbol.toLowerCase()}.svg`;
            results.push(curr);
          }
        })
        .on("error", err => {
          reject(err);
        })
        .on("end", () => {
          resolve(results);
        });
    });
  }

  private async getCurrencies(): Promise<Array<CurrencyDTO>> {
    if (this.isCurrenciesLoaded) return this.currencies;

    this.currencies = await this.loadCurrenciesFromFile();
    this.isCurrenciesLoaded = true;
    return this.currencies;
  }

  async getSupportedCryptocurrencies(): Promise<Array<CurrencyDTO>> {
    // TODO(#235): Pull from database post-MVP
    return this.getCurrencies();
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
