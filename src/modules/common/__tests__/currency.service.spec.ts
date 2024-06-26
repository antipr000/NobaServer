import { Test, TestingModule } from "@nestjs/testing";
import { join } from "path";
import { AWS_ACCESS_KEY_ID_ATTR, AWS_SECRET_ACCESS_KEY_ATTR } from "../../../config/ConfigurationUtils";
import { TestConfigModule } from "../../../core/utils/AppConfigModule";
import { getTestWinstonModule } from "../../../core/utils/WinstonModule";
import { readConfigsFromYamlFiles } from "../../../core/utils/YamlJsonUtils";
import { CurrencyService } from "../currency.service";

/**
 * Need to update config for this to work (work-in-progress). Testing as part of e2e currently.
 */
describe("CurrencyService for e2e test", () => {
  let currencyService: CurrencyService;

  jest.setTimeout(30000);

  beforeEach(async () => {
    const appConfigsDirectory = join(__dirname, "../../../../appconfigs/secrets.yaml");

    let configs = {
      ASSETS_BUCKET_NAME: "prod-noba-assets",
      SUPPORTED_CRYPTO_TOKENS_FILE_BUCKET_PATH: "assets/data/cryptocurrency_tokens.csv",
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
      AWS_REGION: "us-east-1",
      AWS_DEFAULT_REGION: "us-east-1",
    };

    const app: TestingModule = await Test.createTestingModule({
      imports: [
        TestConfigModule.registerAsync({
          assetsBucketName: configs.ASSETS_BUCKET_NAME,
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

      expect(cryptoCurrencies.length).toBeGreaterThan(40);
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

      expect(eth).toEqual({
        name: "Ethereum",
        ticker: "ETH",
        iconPath: "https://dj61eezhizi5l.cloudfront.net/assets/images/currency-logos/crypto/eth.svg",
        precision: 6,
        provider: "ZeroHash",
        type: "Base",
        spreadOverride: undefined,
      });
    });

    it("Should return USDC.ETH DTO with a spread override", async () => {
      const usdcETH = await currencyService.getCryptocurrency("USDC.ETH");

      expect(usdcETH).toEqual({
        name: "USD Coin",
        ticker: "USDC.ETH",
        iconPath: "https://dj61eezhizi5l.cloudfront.net/assets/images/currency-logos/crypto/usdc.eth.svg",
        precision: 8,
        provider: "ZeroHash",
        type: "ERC20",
        spreadOverride: 0.01,
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

describe("CurrencyService for sandbox env", () => {
  let currencyService: CurrencyService;

  jest.setTimeout(30000);

  beforeEach(async () => {
    const appConfigsDirectory = join(__dirname, "../../../../appconfigs/secrets.yaml");

    let configs = {
      ASSETS_BUCKET_NAME: "prod-noba-assets",
      SUPPORTED_CRYPTO_TOKENS_FILE_BUCKET_PATH: "assets/data/cryptocurrency_tokens.csv",
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
      NODE_ENV: "sandbox",
      AWS_ACCESS_KEY_ID: configs.AWS_ACCESS_KEY_ID,
      AWS_SECRET_ACCESS_KEY: configs.AWS_SECRET_ACCESS_KEY,
    };

    const app: TestingModule = await Test.createTestingModule({
      imports: [
        TestConfigModule.registerAsync({
          assetsBucketName: configs.ASSETS_BUCKET_NAME,
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

      expect(cryptoCurrencies.length).toBeGreaterThan(40);
    });

    it("Contains Ethereum with no spread override", async () => {
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
          spreadOverride: undefined,
        },
      ]);
    });

    it("Should filter by the provided list (one item)", async () => {
      const cryptoCurrencies = await currencyService.getSupportedCryptocurrencies(["USDC.POLYGON"]);

      expect(cryptoCurrencies.length).toEqual(1);
      expect(cryptoCurrencies[0].ticker).toEqual("USDC.POLYGON");
    });

    it("Should filter by the provided list (multiple items)", async () => {
      const cryptoCurrencies = await currencyService.getSupportedCryptocurrencies(["BTC", "ETH", "USDC.POLYGON"]);

      expect(cryptoCurrencies.length).toEqual(3);
      expect(cryptoCurrencies[0].ticker).toEqual("BTC");
      expect(cryptoCurrencies[1].ticker).toEqual("ETH");
      expect(cryptoCurrencies[2].ticker).toEqual("USDC.POLYGON");
    });

    it("Should ignore entries in the filter that don't exist", async () => {
      const cryptoCurrencies = await currencyService.getSupportedCryptocurrencies([
        "BTC",
        "AAAA",
        "ETH",
        "USDC.POLYGON",
        "FFFF",
      ]);

      expect(cryptoCurrencies.length).toEqual(3);
      expect(cryptoCurrencies[0].ticker).toEqual("BTC");
      expect(cryptoCurrencies[1].ticker).toEqual("ETH");
      expect(cryptoCurrencies[2].ticker).toEqual("USDC.POLYGON");
    });

    it("Should return the full list if filter is null", async () => {
      const cryptoCurrencies = await currencyService.getSupportedCryptocurrencies(null);
      expect(cryptoCurrencies.length).toBeGreaterThan(40);
    });

    it("Should return the full list if filter is undefined", async () => {
      const cryptoCurrencies = await currencyService.getSupportedCryptocurrencies(undefined);
      expect(cryptoCurrencies.length).toBeGreaterThan(40);
    });

    it("Should return the full list if filter is empty", async () => {
      const cryptoCurrencies = await currencyService.getSupportedCryptocurrencies([]);
      expect(cryptoCurrencies.length).toBeGreaterThan(40);
    });
  });

  it("Does not contain EOS", async () => {
    const cryptocurrencies = await currencyService.getSupportedCryptocurrencies();

    const eosCurrencyList = cryptocurrencies.filter(curr => curr.ticker === "EOS");

    expect(eosCurrencyList.length).toEqual(0);
  });
});
