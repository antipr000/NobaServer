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
import { AssetsService, CurrencyDTO, LocationDTO, ProcessingFeeDTO } from "./api_client";

const supportedCurrenciesTicker = [
  "ZRX.ETH",
  "AAVE.ETH",
  "ALGO",
  "AVAX",
  "AXS.ETH",
  "BAT.ETH",
  "BUSD.ETH",
  "BCH",
  "BTC",
  "ADA",
  "LINK.ETH",
  "COMP.ETH",
  "DAI.ETH",
  "MANA.ETH",
  "DOGE",
  "EGLD",
  "ENJ.ETH",
  "EOS",
  "ETC",
  "ETH",
  "FTM",
  "GRT.ETH",
  "HBAR",
  "KNC.ETH",
  "LTC",
  "MKR.ETH",
  "OMG.ETH",
  "PAXG.ETH",
  "DOT",
  "MATIC.ETH",
  "SAND.ETH",
  "SHIB.ETH",
  "SOL",
  "TUSD.ETH",
  "UNI.ETH",
  "USDC.ETH",
  "USDP.ETH",
  "USDT.ETH",
  "XTZ",
  "WBTC.ETH",
  "XLM",
];
const currencyIconBasePath = "https://dj61eezhizi5l.cloudfront.net/assets/images/currency-logos/crypto";

describe("CryptoCurrencies", () => {
  jest.setTimeout(20000);

  let mongoServer: MongoMemoryServer;
  let mongoUri: string;
  let app: INestApplication;

  beforeAll(async () => {
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

  afterAll(async () => {
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
    // TODO(236): Uncomment the following two tests when we can test in a ZH-enabled environment

    /*it("should work even if no credentials are passed", async () => {
      const response = (await AssetsService.processingFee("USD", 100, "ETH")) as ProcessingFeeDTO & ResponseStatus;
      expect(response.__status).toBe(200);
    });

    it("should work even if credentials are passed", async () => {
      const consumerEmail = "test.consumer@noba.com";
      const consumerLoginResponse = await loginAndGetResponse(mongoUri, consumerEmail, "CONSUMER");
      setAccessTokenForTheNextRequests(consumerLoginResponse.access_token);
      const response = (await AssetsService.processingFee("USD", 100, "ETH")) as ProcessingFeeDTO & ResponseStatus;
      expect(response.__status).toBe(200);
    });*/

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

describe("Locations", () => {
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

  describe("GET /countries", () => {
    it("should work even if no credentials are passed", async () => {
      const getSupportedCountriesResponse = (await AssetsService.getSupportedCountries()) as LocationDTO[] &
        ResponseStatus;

      expect(getSupportedCountriesResponse.__status).toBe(200);
    });

    it("should obtain 205 countries without subdivisions", async () => {
      const getSupportedCountriesResponse = (await AssetsService.getSupportedCountries()) as LocationDTO[] &
        ResponseStatus;

      expect(getSupportedCountriesResponse.__status).toBe(200);

      // Have to remap into array due to the way we're pulling the array & ResponseStatus back into one object
      const allCountries = [];
      Object.keys(getSupportedCountriesResponse).forEach(key => {
        if (key === "__status") return;
        allCountries.push(getSupportedCountriesResponse[key]);
      });

      expect(allCountries.length).toEqual(205);

      // Pick one country and validate mappings
      const us = allCountries.find(element => element.countryISOCode === "US");

      expect(us.countryISOCode).toBe("US");
      expect(us.countryName).toBe("United States");
      expect(us.alternateCountryName).toBe("United States");
      expect(us.subdivisions).toBeUndefined();
    });

    it("should obtain 205 countries with subdivisions", async () => {
      const getSupportedCountriesResponse = (await AssetsService.getSupportedCountries(true)) as LocationDTO[] &
        ResponseStatus;

      expect(getSupportedCountriesResponse.__status).toBe(200);

      // Have to remap into array due to the way we're pulling the array & ResponseStatus back into one object
      const allCountries = [];
      Object.keys(getSupportedCountriesResponse).forEach(key => {
        if (key === "__status") return;
        allCountries.push(getSupportedCountriesResponse[key]);
      });

      expect(allCountries.length).toEqual(205);

      // Pick one country and validate mappings
      const us = allCountries.find(element => element.countryISOCode === "US");

      expect(us.countryISOCode).toBe("US");
      expect(us.countryName).toBe("United States");
      expect(us.alternateCountryName).toBe("United States");
      expect(us.subdivisions.length).toBe(66);
      expect(us.subdivisions.find(element => element.code === "WA").code).toBe("WA");
      expect(us.subdivisions.find(element => element.code === "WA").name).toBe("Washington");
    });

    it("should return the deatils of a single country with subdivisions", async () => {
      const us = (await AssetsService.getSupportedCountry("US")) as LocationDTO & ResponseStatus;
      expect(us.__status).toBe(200);

      expect(us.countryISOCode).toBe("US");
      expect(us.countryName).toBe("United States");
      expect(us.alternateCountryName).toBe("United States");
      expect(us.subdivisions.length).toBe(66);
      expect(us.subdivisions.find(element => element.code === "WA").code).toBe("WA");
      expect(us.subdivisions.find(element => element.code === "WA").name).toBe("Washington");
    });
  });
});
