/**
 * Setup the required environment variables for
 *   - API Client
 *   - Test Configs for different Vendors
 *
 * This is required to be the very first line in
 * the test files (even before other imports) as
 * API Client requires certain environment variables
 * to be set before any of it's class is even
 * imported.
 */
import { setUp } from "./setup";
setUp();

import { INestApplication } from "@nestjs/common";
import { MongoMemoryServer } from "mongodb-memory-server";
import mongoose from "mongoose";
import { bootstrap } from "../src/server";
import { clearAccessTokenForNextRequests, loginAndGetResponse, setAccessTokenForTheNextRequests } from "./common";
import { ResponseStatus } from "./api_client/core/request";
import { AssetsService, CurrencyDTO } from "./api_client";

const supportedCurrenciesTicker = [
  "ZRX",
  "AAVE",
  "ALGO",
  "AVAX",
  "AXS",
  "BAT",
  "BUSD",
  "BCH",
  "BTC",
  "ADA",
  "LINK",
  "COMP",
  "DAI",
  "MANA",
  "DOGE",
  "EGLD",
  "ENJ",
  "EOS",
  "ETC",
  "ETH",
  "FTM",
  "GRT",
  "HBAR",
  "KNC",
  "LTC",
  "MKR",
  "OMG",
  "PAXG",
  "DOT",
  "MATIC",
  "SAND",
  "SHIB",
  "SOL",
  "TUSD",
  "UNI",
  "USDC.ETH",
  "USDP",
  "USDT",
  "XTZ",
  "WBTC",
  "XLM",
];
const currencyIconBasePath = "https://dj61eezhizi5l.cloudfront.net/assets/images/currency-logos/crypto";

describe("CryptoCurrencies", () => {
  jest.setTimeout(20000);

  let mongoServer: MongoMemoryServer;
  let mongoUri: string;
  let app: INestApplication;

  beforeEach(async () => {
    const port = process.env.PORT;

    // Spin up an in-memory mongodb server
    mongoServer = await MongoMemoryServer.create();
    mongoUri = mongoServer.getUri();

    const environmentVaraibles = {
      MONGO_URI: mongoUri,
    };
    app = await bootstrap(environmentVaraibles);
    await app.listen(port);
  });

  afterEach(async () => {
    clearAccessTokenForNextRequests();
    await mongoose.disconnect();
    await app.close();
    await mongoServer.stop();
  });

  describe("GET /cryptocurrencies", () => {
    it("should work even if no credentials is passed", async () => {
      const getCryptoCurrencyResponse = (await AssetsService.supportedCryptocurrencies()) as CurrencyDTO[] &
        ResponseStatus;

      expect(getCryptoCurrencyResponse.__status).toBe(200);
    });

    it("should work even if credentials are passed", async () => {
      const consumerEmail = "test.consumer@noba.com";
      const consumerLoginResponse = await loginAndGetResponse(mongoUri, consumerEmail, "CONSUMER");
      setAccessTokenForTheNextRequests(consumerLoginResponse.access_token);

      const getCryptoCurrencyResponse = (await AssetsService.supportedCryptocurrencies()) as CurrencyDTO[] &
        ResponseStatus;
      expect(getCryptoCurrencyResponse.__status).toBe(200);
    });

    it("should return 41 currencies list", async () => {
      const getCryptoCurrencyResponse = (await AssetsService.supportedCryptocurrencies()) as CurrencyDTO[] &
        ResponseStatus;
      expect(getCryptoCurrencyResponse.__status).toBe(200);

      const allTickers = [];
      Object.keys(getCryptoCurrencyResponse).forEach(key => {
        if (key === "__status") return;
        allTickers.push(getCryptoCurrencyResponse[key].ticker);
      });

      expect(allTickers.sort()).toEqual(supportedCurrenciesTicker.sort());
    });

    it("returned 41 currencies list should have proper iconPath", async () => {
      const getCryptoCurrencyResponse = (await AssetsService.supportedCryptocurrencies()) as CurrencyDTO[] &
        ResponseStatus;
      expect(getCryptoCurrencyResponse.__status).toBe(200);

      const receivedIconPaths = [];
      Object.keys(getCryptoCurrencyResponse).forEach(key => {
        if (key === "__status") return;
        receivedIconPaths.push(getCryptoCurrencyResponse[key].iconPath);
      });

      const expectedIconPaths = supportedCurrenciesTicker.map(
        value => `${currencyIconBasePath}/${value.toLowerCase()}.svg`,
      );
      expect(receivedIconPaths.sort()).toEqual(expectedIconPaths.sort());
    });
  });

  describe("GET /fiatcurrencies", () => {
    it("should work even if no credentials is passed", async () => {
      const getFiatCurrencyResponse = (await AssetsService.supportedFiatCurrencies()) as CurrencyDTO[] & ResponseStatus;

      expect(getFiatCurrencyResponse.__status).toBe(200);
    });

    it("should work even if credentials are passed", async () => {
      const consumerEmail = "test.consumer@noba.com";
      const consumerLoginResponse = await loginAndGetResponse(mongoUri, consumerEmail, "CONSUMER");
      setAccessTokenForTheNextRequests(consumerLoginResponse.access_token);

      const getFiatCurrencyResponse = (await AssetsService.supportedFiatCurrencies()) as CurrencyDTO[] & ResponseStatus;
      expect(getFiatCurrencyResponse.__status).toBe(200);
    });

    it("should return only 'US' currency", async () => {
      const getFiatCurrencyResponse = (await AssetsService.supportedFiatCurrencies()) as CurrencyDTO[] & ResponseStatus;
      expect(getFiatCurrencyResponse.__status).toBe(200);

      const allTickers = [];
      Object.keys(getFiatCurrencyResponse).forEach(key => {
        if (key === "__status") return;
        allTickers.push(getFiatCurrencyResponse[key].ticker);
      });

      expect(allTickers.sort()).toEqual(["USD"].sort());
    });

    it("returned currencies list should have proper iconPath", async () => {
      const getFiatCurrencyResponse = (await AssetsService.supportedFiatCurrencies()) as CurrencyDTO[] & ResponseStatus;
      expect(getFiatCurrencyResponse.__status).toBe(200);

      const receivedIconPaths = [];
      Object.keys(getFiatCurrencyResponse).forEach(key => {
        if (key === "__status") return;
        receivedIconPaths.push(getFiatCurrencyResponse[key].iconPath);
      });

      const expectedIconPaths = ["https://dj61eezhizi5l.cloudfront.net/assets/images/currency-logos/fiat/usd.svg"];

      expect(receivedIconPaths.sort()).toEqual(expectedIconPaths.sort());
    });
  });

  describe("GET /exchangerates/priceinfiat/{fiatCurrencyCode}", () => {
    /*
      Tested these locally but commenting until we have a e2e env that can test ZH connectivity.
    */
    it("should work even if no credentials is passed", async () => {
      // const getExchangeRatesResponse = await AssetsService.priceInFiat("USD", "ETH");
      // expect(getExchangeRatesResponse.__status).toBe(200);
      // I don't think we could ever satisfy this as it's too hard to predict. Good enough to check the 200 response code.
      // expect(getExchangeRatesResponse).toBe({});
    });

    it("should work even if credentials are passed", async () => {
      // const consumerEmail = "test.consumer@noba.com";
      // const consumerLoginResponse = await loginAndGetResponse(mongoUri, consumerEmail, "CONSUMER");
      // setAccessTokenForTheNextRequests(consumerLoginResponse.access_token);
      // const getExchangeRatesResponse = (await AssetsService.supportedFiatCurrencies()) as CurrencyDTO[] &
      //   ResponseStatus;
      // expect(getExchangeRatesResponse.__status).toBe(200);
    });

    it("should throw 400 if 'fiatCurrencyCode' is incorrect", async () => {
      // const getExchangeRatesResponse = await AssetsService.priceInFiat("ABC", "ETH");
      // expect(getExchangeRatesResponse.__status).toBe(400);
    });

    it("should throw 400 if 'cryptoCurrencyCode' is incorrect", async () => {
      // const getExchangeRatesResponse = await AssetsService.priceInFiat("USD", "ABC");
      // expect(getExchangeRatesResponse.__status).toBe(400);
    });

    it("should throw 400 if both 'fiatCurrencyCode' & 'cryptoCurrencyCode' is incorrect", async () => {
      // const getExchangeRatesResponse = await AssetsService.priceInFiat("ABC", "ABC");
      // expect(getExchangeRatesResponse.__status).toBe(400);
    });
  });

  describe("GET /exchangerates/processingfee/{fiatCurrencyCode}", () => {
    it("should work even if no credentials is passed", async () => {
      // @subham - this returns a ProcessingFeeDTO promise. How can we get the HTTP status code from that? I see priceInFiat returns 'any', which I'd think we we'll want to change.
      //const getProcessingFeeResponse = await AssetsService.processingFee("USD", 100, "ETH");
      //expect(getProcessingFeeResponse.__status).toBe(200);
    });

    it("should work even if credentials are passed", async () => {});

    it("should throw 400 if 'fiatCurrencyCode' is incorrect", async () => {});

    it("should throw 400 if 'cryptoCurrencyCode' is incorrect", async () => {});

    it("should throw 400 if 'fiatAmount' is zero(0)", async () => {});

    it("should throw 400 if 'fiatAmount' is negative number", async () => {});

    it("should throw 400 if 'fiatAmount' is alphanumeric", async () => {});

    it("should return the fees successfully", async () => {});
  });
});
