import { TestingModule, Test } from "@nestjs/testing";
import { getTestWinstonModule } from "../../../core/utils/WinstonModule";
import { TestConfigModule } from "../../../core/utils/AppConfigModule";
import { CurrencyService } from "../currency.service";
import { CurrencyDTO } from "../dto/CurrencyDTO";

/**
 * Need to update config for this to work (work-in-progress). Testing as part of e2e currently.
 */
describe("CurrencyService", () => {
  let currencyService: CurrencyService;

  jest.setTimeout(30000);

  beforeEach(async () => {
    process.env = {
      ...process.env,
      NODE_ENV: "development",
    };

    const app: TestingModule = await Test.createTestingModule({
      imports: [
        TestConfigModule.registerAsync({
          SUPPORTED_CRYPTO_TOKENS_FILE_PATH: `./appconfigs/supported_tokens.csv`,
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
      expect(cryptoCurrencies.length).toEqual(42);
    });

    it("Contains Ethereum", async () => {
      const cryptocurrencies = await currencyService.getSupportedCryptocurrencies();

      const ethCurrencyList = cryptocurrencies.filter(curr => curr.ticker === "ETH");

      expect(ethCurrencyList.length).toEqual(1);

      const ethCurrency = ethCurrencyList[0];

      const expectedETH: CurrencyDTO = {
        name: "Ethereum",
        ticker: "ETH",
        iconPath: "https://dj61eezhizi5l.cloudfront.net/assets/images/currency-logos/crypto/eth.svg",
        precision: 6,
      };

      expect(ethCurrency).toEqual(expectedETH);
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

      expect(usdCurrencyList.length).toEqual(1);
      const usdCurrency = usdCurrencyList[0];

      const expectedDollar: CurrencyDTO = {
        name: "US Dollar",
        ticker: "USD",
        iconPath: "https://dj61eezhizi5l.cloudfront.net/assets/images/currency-logos/fiat/usd.svg",
        precision: 2,
      };
      expect(usdCurrency).toEqual(expectedDollar);
    });
  });
});
