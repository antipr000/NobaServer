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
import {
  clearAccessTokenForNextRequests,
  loginAndGetResponse,
  setAccessTokenForTheNextRequests,
  setupPartner,
} from "./common";
import { ResponseStatus } from "./api_client/core/request";
import { AssetsService, CurrencyDTO, LocationDTO } from "./api_client";
import { ConfigurationsDTO } from "./api_client/models/ConfigurationsDTO";

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
  "USDC.POLYGON",
  "USDP.ETH",
  "USDT.ETH",
  "XTZ",
  "WBTC.ETH",
  "XLM",
];
const currencyIconBasePath = "https://dj61eezhizi5l.cloudfront.net/assets/images/currency-logos/crypto";

describe("CryptoCurrencies & Locations", () => {
  jest.setTimeout(20000);

  let mongoServer: MongoMemoryServer;
  let mongoUri: string;
  let app: INestApplication;

  beforeEach(async () => {
    const port = process.env.PORT;

    // Spin up an in-memory mongodb server
    mongoServer = await MongoMemoryServer.create();
    mongoUri = mongoServer.getUri();
    await setupPartner(mongoUri, "dummy-partner");

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

    it("should return 42 currencies list", async () => {
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
      expect(us.subdivisions.length).toBe(52);
      expect(us.subdivisions.find(element => element.code === "WA").code).toBe("WA");
      expect(us.subdivisions.find(element => element.code === "WA").name).toBe("Washington");
    });

    it("should return the deatils of a single country with subdivisions", async () => {
      const us = (await AssetsService.getSupportedCountry("US")) as LocationDTO & ResponseStatus;
      expect(us.__status).toBe(200);

      expect(us.countryISOCode).toBe("US");
      expect(us.countryName).toBe("United States");
      expect(us.alternateCountryName).toBe("United States");
      expect(us.subdivisions.length).toBe(52);
      expect(us.subdivisions.find(element => element.code === "WA").code).toBe("WA");
      expect(us.subdivisions.find(element => element.code === "WA").name).toBe("Washington");
    });
  });

  describe("GET /configs", () => {
    it("should return all api configurations", async () => {
      const config = (await AssetsService.getCommonConfigurations()) as ConfigurationsDTO & ResponseStatus;
      expect(config.__status).toBe(200);

      expect(config.lowAmountThreshold).toBe(50);
      expect(config.highAmountThreshold).toBe(200);
      expect(config.cryptoImageBaseUrl).toBe(
        "https://dj61eezhizi5l.cloudfront.net/assets/images/currency-logos/crypto",
      );
      expect(config.fiatImageBaseUrl).toBe("https://dj61eezhizi5l.cloudfront.net/assets/images/currency-logos/fiat");
    });
  });
});
