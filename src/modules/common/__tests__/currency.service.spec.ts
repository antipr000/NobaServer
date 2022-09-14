import { TestingModule, Test } from "@nestjs/testing";
import { getTestWinstonModule } from "../../../core/utils/WinstonModule";
import { TestConfigModule } from "../../../core/utils/AppConfigModule";
import { CurrencyService } from "../currency.service";
import { join } from "path";
import { readConfigsFromYamlFiles } from "../../../core/utils/YamlJsonUtils";
import { AWS_ACCESS_KEY_ID_ATTR, AWS_SECRET_ACCESS_KEY_ATTR } from "../../../config/ConfigurationUtils";

/**
 * Need to update config for this to work (work-in-progress). Testing as part of e2e currently.
 */
describe("CurrencyService", () => {
  let currencyService: CurrencyService;

  jest.setTimeout(30000);

  beforeEach(async () => {
    const appConfigsDirectory = join(__dirname, "../../../../appconfigs/secrets.yaml");

    let configs = {
      SUPPORTED_CRYPTO_TOKENS_BUCKET_NAME: "prod-noba-assets",
      SUPPORTED_CRYPTO_TOKENS_FILE_BUCKET_PATH: "assets/data/cryptocurrency_tokens_lowers.csv",
      AWS_ACCESS_KEY_ID: null,
      AWS_SECRET_ACCESS_KEY: null,
    };

    if (process.env["AWS_ACCESS_KEY_ID"]) {
      configs = {
        ...configs,
        AWS_ACCESS_KEY_ID: process.env["AWS_ACCESS_KEY_ID"],
        AWS_SECRET_ACCESS_KEY: process.env["AWS_SECRET_ACCESS_KEY"],
      };
    } else {
      const fileConfigs = readConfigsFromYamlFiles(appConfigsDirectory);
      configs = {
        ...configs,
        AWS_ACCESS_KEY_ID: fileConfigs[AWS_ACCESS_KEY_ID_ATTR],
        AWS_SECRET_ACCESS_KEY: fileConfigs[AWS_SECRET_ACCESS_KEY_ATTR],
      };
    }

    process.env = {
      ...process.env,
      NODE_ENV: "e2e_test",
      AWS_ACCESS_KEY_ID: configs.AWS_ACCESS_KEY_ID,
      AWS_SECRET_ACCESS_KEY: configs.AWS_SECRET_ACCESS_KEY,
    };

    const app: TestingModule = await Test.createTestingModule({
      imports: [
        TestConfigModule.registerAsync({
          supportedCryptoBucketName: configs.SUPPORTED_CRYPTO_TOKENS_BUCKET_NAME,
          supportedCryptoFileBucketPath: configs.SUPPORTED_CRYPTO_TOKENS_FILE_BUCKET_PATH,
        }),
        getTestWinstonModule(),
      ],
      controllers: [],
      providers: [CurrencyService],
    }).compile();

    currencyService = app.get<CurrencyService>(CurrencyService);
  });

  describe("getSupportedCryptocurrencies()", () => {
    it("Should return the full set of cryptocurrencies", async () => {
      const cryptoCurrencies = await currencyService.getSupportedCryptocurrencies();

      // These assertions should change every time we update CreditCardDTO.unsupportedIssuers or all_bins.csv
      expect(cryptoCurrencies.length).toEqual(43);
    });

    it("Contains Ethereum", async () => {
      const cryptocurrencies = await currencyService.getSupportedCryptocurrencies();

      const ethCurrencyList = cryptocurrencies.filter(curr => curr.ticker === "ETH");

      expect(ethCurrencyList).toEqual([
        {
          name: "Ethereum",
          ticker: "ETH",
          iconPath: "https://dj61eezhizi5l.cloudfront.net/assets/images/currency-logos/crypto/eth.svg",
          precision: 6,
          provider: "ZeroHash",
          type: "Base",
        },
      ]);
    });
  });

  describe("getCryptoCurrency()", () => {
    it("Should return ETH DTO", async () => {
      const eth = await currencyService.getCryptocurrency("ETH");

      // These assertions should change every time we update CreditCardDTO.unsupportedIssuers or all_bins.csv
      expect(eth).toEqual({
        name: "Ethereum",
        ticker: "ETH",
        iconPath: "https://dj61eezhizi5l.cloudfront.net/assets/images/currency-logos/crypto/eth.svg",
        precision: 6,
        provider: "ZeroHash",
        type: "Base",
      });
    });

    it("Should return null", async () => {
      const nullCurrency = await currencyService.getCryptocurrency("NONEXISTENT");
      expect(nullCurrency).toBeNull();
    });
  });

  describe("getSupportedFiatCurrencies()", () => {
    it("Validate number of supported fiat currencies", async () => {
      const fiatCurrencies = await currencyService.getSupportedFiatCurrencies();
      expect(fiatCurrencies.length).toEqual(1);
    });

    it("Contains US Dollar", async () => {
      const fiatCurrencies = await currencyService.getSupportedFiatCurrencies();

      const usdCurrencyList = fiatCurrencies.filter(curr => curr.ticker === "USD");

      expect(usdCurrencyList).toEqual([
        {
          name: "US Dollar",
          ticker: "USD",
          iconPath: "https://dj61eezhizi5l.cloudfront.net/assets/images/currency-logos/fiat/usd.svg",
          precision: 2,
        },
      ]);
    });
  });

  describe("getFiatCurrency()", () => {
    it("Should return USD DTO", async () => {
      const usd = await currencyService.getFiatCurrency("USD");

      // These assertions should change every time we update CreditCardDTO.unsupportedIssuers or all_bins.csv
      expect(usd).toEqual({
        name: "US Dollar",
        ticker: "USD",
        iconPath: "https://dj61eezhizi5l.cloudfront.net/assets/images/currency-logos/fiat/usd.svg",
        precision: 2,
      });
    });

    it("Should return null", async () => {
      const nullCurrency = await currencyService.getFiatCurrency("NONEXISTENT");
      expect(nullCurrency).toBeNull();
    });
  });
});
