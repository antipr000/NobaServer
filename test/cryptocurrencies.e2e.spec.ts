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
import { AssetsService, CurrencyDTO, ProcessingFeeDTO } from "./api_client";

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
    it("should work even if no credentials are passed", async () => {
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
    it("should work even if no credentials are passed", async () => {
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
    // TODO(236): Uncomment the following two tests when we can test in a ZH-enabled environment

    /*
     it("should work even if no credentials are passed", async () => {
       const response = await AssetsService.priceInFiat("USD", "ETH");
       expect(response.__status).toBe(200);
     });

    it("should work even if credentials are passed", async () => {
      const consumerEmail = "test.consumer@noba.com";
      const consumerLoginResponse = await loginAndGetResponse(mongoUri, consumerEmail, "CONSUMER");
      setAccessTokenForTheNextRequests(consumerLoginResponse.access_token);
      const response = (await AssetsService.priceInFiat("USD", "ETH")) as CurrencyDTO[] & ResponseStatus;
      expect(response.__status).toBe(200);
    });
    */

    it("should throw 400 if 'fiatCurrencyCode' is incorrect", async () => {
      const response = await AssetsService.priceInFiat("ABC", "ETH");
      expect(response.__status).toBe(400);
    });

    it("should throw 400 if 'cryptoCurrencyCode' is incorrect", async () => {
      const response = await AssetsService.priceInFiat("USD", "ABC");
      expect(response.__status).toBe(400);
    });

    it("should throw 400 if both 'fiatCurrencyCode' & 'cryptoCurrencyCode' is incorrect", async () => {
      const response = await AssetsService.priceInFiat("ABC", "ABC");
      expect(response.__status).toBe(400);
    });
  });

  describe("GET /exchangerates/processingfee/{fiatCurrencyCode}", () => {
    it("should work even if no credentials are passed", async () => {
      const response = (await AssetsService.processingFee("USD", 100, "ETH")) as ProcessingFeeDTO & ResponseStatus;
      expect(response.__status).toBe(200);
    });

    it("should work even if credentials are passed", async () => {
      const consumerEmail = "test.consumer@noba.com";
      const consumerLoginResponse = await loginAndGetResponse(mongoUri, consumerEmail, "CONSUMER");
      setAccessTokenForTheNextRequests(consumerLoginResponse.access_token);
      const response = (await AssetsService.processingFee("USD", 100, "ETH")) as ProcessingFeeDTO & ResponseStatus;
      expect(response.__status).toBe(200);
    });

    it("should throw 400 if 'fiatCurrencyCode' is incorrect", async () => {
      const response = (await AssetsService.processingFee("ABC", 100, "ETH")) as ProcessingFeeDTO & ResponseStatus;
      expect(response.__status).toBe(400);
    });

    it("should throw 400 if 'cryptoCurrencyCode' is incorrect", async () => {
      const response = (await AssetsService.processingFee("USD", 100, "ABC")) as ProcessingFeeDTO & ResponseStatus;
      expect(response.__status).toBe(400);
    });

    it("should throw 400 if 'fiatAmount' is zero(0)", async () => {
      const response = (await AssetsService.processingFee("USD", 0, "ETH")) as ProcessingFeeDTO & ResponseStatus;
      expect(response.__status).toBe(400);
    });

    it("should throw 400 if 'fiatAmount' is negative number", async () => {
      const response = (await AssetsService.processingFee("USD", -5, "ETH")) as ProcessingFeeDTO & ResponseStatus;
      expect(response.__status).toBe(400);
    });
  });
});