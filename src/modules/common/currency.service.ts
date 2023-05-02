import { Injectable } from "@nestjs/common";
import { GetObjectCommand, S3 } from "@aws-sdk/client-s3";
import { parse } from "csv";
import {
  AppEnvironment,
  ASSETS_BUCKET_NAME,
  getEnvironmentName,
  SUPPORTED_CRYPTO_TOKENS_FILE_BUCKET_PATH,
} from "../../config/ConfigurationUtils";
import { CustomConfigService } from "../../core/utils/AppConfigModule";
import { CurrencyDTO } from "../../modules/common/dto/CurrencyDTO";
import { Readable } from "stream";

@Injectable()
export class CurrencyService {
  private currencies: Array<CurrencyDTO>;
  private isCurrenciesLoaded: boolean;

  constructor(private readonly configService: CustomConfigService) {
    this.isCurrenciesLoaded = false;
    this.currencies = [];
  }

  private async loadCurrenciesFromS3(): Promise<Array<CurrencyDTO>> {
    const environment: AppEnvironment = getEnvironmentName();
    const results = new Array<CurrencyDTO>();
    const parser = parse({ delimiter: ",", columns: true });
    const s3 = new S3({});
    const options = {
      Bucket: this.configService.get(ASSETS_BUCKET_NAME),
      Key: this.configService.get(SUPPORTED_CRYPTO_TOKENS_FILE_BUCKET_PATH),
    };

    const getObjectCommand = new GetObjectCommand(options);
    const getObjectResult = await s3.send(getObjectCommand);
    const stringifiedResult = await getObjectResult.Body.transformToString();

    return new Promise((resolve, reject) => {
      const readStream = new Readable();
      readStream.push(stringifiedResult);
      readStream.push(null);
      readStream
        .pipe(parser)
        .on("data", data => {
          const isValidForEnv: boolean = `${data[environment]}`.trim().toLowerCase() == "true";
          if (isValidForEnv) {
            const name = `${data["Name"]}`.trim();
            const symbol = `${data["Symbol"]}`.trim();
            const precision = Number(`${data["Precision"]}`.trim());
            const provider = `${data["Provider"]}`.trim();
            const type = `${data["Type"]}`.trim();
            const spreadOverride = data["SpreadOverride"].trim();

            const curr = new CurrencyDTO();
            curr.name = name;
            curr.ticker = symbol;
            curr.type = type;
            curr.provider = provider;
            curr.iconPath = `https://dj61eezhizi5l.cloudfront.net/assets/images/currency-logos/crypto/${symbol.toLowerCase()}.svg`;
            curr.precision = precision;
            // Should be undefined if no value is set, in which case we use system default
            curr.spreadOverride = spreadOverride ? Number(spreadOverride) : undefined;
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
    this.currencies = await this.loadCurrenciesFromS3();
    this.isCurrenciesLoaded = true;

    return this.currencies;
  }

  async getSupportedCryptocurrencies(cryptoFilter?: string[]): Promise<Array<CurrencyDTO>> {
    const supportedCryptocurrencies = await this.getCurrencies();

    if (cryptoFilter !== null && cryptoFilter !== undefined && cryptoFilter.length > 0) {
      return supportedCryptocurrencies.filter(curr => cryptoFilter.includes(curr.ticker));
    } else {
      return supportedCryptocurrencies;
    }
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
