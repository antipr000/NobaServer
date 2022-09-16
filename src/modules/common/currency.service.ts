import { Injectable } from "@nestjs/common";
import { S3 } from "aws-sdk";
import { parse } from "csv";
import { ASSETS_BUCKET_NAME, SUPPORTED_CRYPTO_TOKENS_FILE_BUCKET_PATH } from "../../config/ConfigurationUtils";
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

  private async loadCurrenciesFromS3(): Promise<Array<CurrencyDTO>> {
    return new Promise((resolve, reject) => {
      const results = new Array<CurrencyDTO>();
      const parser = parse({ delimiter: ",", columns: true });
      const s3 = new S3();
      const options = {
        Bucket: this.configService.get(ASSETS_BUCKET_NAME),
        Key: this.configService.get(SUPPORTED_CRYPTO_TOKENS_FILE_BUCKET_PATH),
      };

      const readStream = s3.getObject(options).createReadStream();
      readStream
        .pipe(parser)
        .on("data", data => {
          const name = `${data["Name"]}`.trim();
          const symbol = `${data["Symbol"]}`.trim();
          const precision = Number(`${data["Precision"]}`.trim());
          const provider = `${data["Provider"]}`.trim();
          const type = `${data["Type"]}`.trim();
          // Include only records for which ZH provides liquidity services (Liquidity=Yes)
          // Exclude XRP
          const curr = new CurrencyDTO();
          curr.name = name;
          curr.ticker = symbol;
          curr.type = type;
          curr.provider = provider;
          curr.iconPath = `https://dj61eezhizi5l.cloudfront.net/assets/images/currency-logos/crypto/${symbol.toLowerCase()}.svg`;
          curr.precision = precision;
          results.push(curr);
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

    this.currencies = await this.loadCurrenciesFromS3();
    this.isCurrenciesLoaded = true;

    return this.currencies;
  }

  async getSupportedCryptocurrencies(): Promise<Array<CurrencyDTO>> {
    // TODO(#235): Pull from database post-MVP
    return this.getCurrencies();
  }

  async getCryptocurrency(ticker: string): Promise<CurrencyDTO> {
    const cryptoCurrencies = await this.getSupportedCryptocurrencies();
    const cryptoCurrencyArray = cryptoCurrencies.filter(curr => curr.ticker === ticker);
    if (cryptoCurrencyArray.length == 0) {
      return null;
    }
    return cryptoCurrencyArray[0];
  }

  async getSupportedFiatCurrencies(): Promise<CurrencyDTO[]> {
    // TODO(#235): Pull from database post-MVP
    return [
      {
        name: "US Dollar",
        ticker: "USD",
        iconPath: "https://dj61eezhizi5l.cloudfront.net/assets/images/currency-logos/fiat/usd.svg",
        precision: 2,
      },
    ];
  }

  async getFiatCurrency(ticker: string): Promise<CurrencyDTO> {
    const fiatCurrencies = await this.getSupportedFiatCurrencies();
    const fiatCurrencyArray = fiatCurrencies.filter(curr => curr.ticker === ticker);
    if (fiatCurrencyArray.length == 0) {
      return null;
    }
    return fiatCurrencyArray[0];
  }
}
