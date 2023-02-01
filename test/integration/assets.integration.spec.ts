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
import { setUpEnvironmentVariablesToLoadTheSourceCode } from "../setup";
setUpEnvironmentVariablesToLoadTheSourceCode();

import { BadRequestException, INestApplication } from "@nestjs/common";
//import { MongoMemoryServer } from "mongodb-memory-server";
//import mongoose from "mongoose";
import { bootstrap } from "../../src/server";
import {
  clearAccessTokenForNextRequests,
  computeSignature,
  loginAndGetResponse,
  setAccessTokenForTheNextRequests,
  TEST_API_KEY,
} from "../common";
import { ResponseStatus } from "../api_client/core/request";
import { AssetsService, CurrencyDTO, LocationDTO } from "../api_client";
import { ConfigurationsDTO } from "../api_client/models/ConfigurationsDTO";

const currencyIconBasePath = "https://dj61eezhizi5l.cloudfront.net/assets/images/currency-logos/crypto";

describe("CryptoCurrencies & Locations", () => {
  jest.setTimeout(20000);

  //let mongoServer: MongoMemoryServer;
  let mongoUri: string;
  let app: INestApplication;
  let TEST_TIMESTAMP;

  beforeAll(async () => {
    const port = process.env.PORT;

    app = await bootstrap({});
    await app.listen(port);
    TEST_TIMESTAMP = new Date().getTime().toString();
  });

  afterAll(async () => {
    await app.close();
  });

  afterEach(async () => {
    clearAccessTokenForNextRequests();
  });

  describe("GET /cryptocurrencies", () => {
    it("should work even if no credentials are passed", async () => {
      const signature = computeSignature(TEST_TIMESTAMP, "GET", "/v1/cryptocurrencies", JSON.stringify({}));
      const getCryptoCurrencyResponse = (await AssetsService.supportedCryptocurrencies({
        xNobaApiKey: TEST_API_KEY,
        xNobaSignature: signature,
        xNobaTimestamp: TEST_TIMESTAMP,
      })) as CurrencyDTO[] & ResponseStatus;

      expect(getCryptoCurrencyResponse.__status).toBe(200);
    });

    it("should throw error when timestamp is beyond 5 minutes", async () => {
      const timestamp = new Date();
      const signature = computeSignature(TEST_TIMESTAMP, "GET", "/v1/cryptocurrencies", JSON.stringify({}));

      timestamp.setMinutes(timestamp.getMinutes() - 6);

      try {
        (await AssetsService.supportedCryptocurrencies({
          xNobaApiKey: TEST_API_KEY,
          xNobaSignature: signature,
          xNobaTimestamp: timestamp.getTime().toString(),
        })) as CurrencyDTO[] & ResponseStatus;
      } catch (e) {
        expect(e).toBeInstanceOf(BadRequestException);
        expect(e).toBe("Timestamp is more than 5 minutes different than expected");
      }
    });

    it("should work even if credentials are passed", async () => {
      const consumerEmail = "test.consumer@noba.com";
      const consumerLoginResponse = await loginAndGetResponse(mongoUri, consumerEmail, "CONSUMER");
      setAccessTokenForTheNextRequests(consumerLoginResponse.accessToken);

      const signature = computeSignature(TEST_TIMESTAMP, "GET", "/v1/cryptocurrencies", JSON.stringify({}));
      const getCryptoCurrencyResponse = (await AssetsService.supportedCryptocurrencies({
        xNobaApiKey: TEST_API_KEY,
        xNobaSignature: signature,
        xNobaTimestamp: TEST_TIMESTAMP,
      })) as CurrencyDTO[] & ResponseStatus;
      expect(getCryptoCurrencyResponse.__status).toBe(200);
    });

    it("should return a core set of cryptocurrencies", async () => {
      const signature = computeSignature(TEST_TIMESTAMP, "GET", "/v1/cryptocurrencies", JSON.stringify({}));
      const getCryptoCurrencyResponse = (await AssetsService.supportedCryptocurrencies({
        xNobaApiKey: TEST_API_KEY,
        xNobaSignature: signature,
        xNobaTimestamp: TEST_TIMESTAMP,
      })) as CurrencyDTO[] & ResponseStatus;
      expect(getCryptoCurrencyResponse.__status).toBe(200);

      const allTickers = [];
      Object.keys(getCryptoCurrencyResponse).forEach(key => {
        if (key === "__status") return;
        allTickers.push(getCryptoCurrencyResponse[key].ticker);
      });

      expect(allTickers.length).toBeGreaterThan(40);
    });

    it("returned currencies list should have proper iconPath", async () => {
      const signature = computeSignature(TEST_TIMESTAMP, "GET", "/v1/cryptocurrencies", JSON.stringify({}));
      const getCryptoCurrencyResponse = (await AssetsService.supportedCryptocurrencies({
        xNobaApiKey: TEST_API_KEY,
        xNobaSignature: signature,
        xNobaTimestamp: TEST_TIMESTAMP,
      })) as CurrencyDTO[] & ResponseStatus;
      expect(getCryptoCurrencyResponse.__status).toBe(200);

      const receivedIconPaths = [];
      Object.keys(getCryptoCurrencyResponse).forEach(key => {
        if (key === "__status") return;
        receivedIconPaths.push(getCryptoCurrencyResponse[key].iconPath);
      });

      expect(receivedIconPaths.length).toBeGreaterThan(40);
    });

    it("should return 403 status code if signature is wrong", async () => {
      const signature = "some-random-signature";
      const getCryptoCurrencyResponse = (await AssetsService.supportedCryptocurrencies({
        xNobaApiKey: TEST_API_KEY,
        xNobaSignature: signature,
        xNobaTimestamp: TEST_TIMESTAMP,
      })) as CurrencyDTO[] & ResponseStatus;
      expect(getCryptoCurrencyResponse.__status).toBe(403);
    });
  });

  describe("GET /fiatcurrencies", () => {
    it("should work even if no credentials are passed", async () => {
      const signature = computeSignature(TEST_TIMESTAMP, "GET", "/v1/fiatcurrencies", JSON.stringify({}));
      const getFiatCurrencyResponse = (await AssetsService.supportedFiatCurrencies({
        xNobaApiKey: TEST_API_KEY,
        xNobaSignature: signature,
        xNobaTimestamp: TEST_TIMESTAMP,
      })) as CurrencyDTO[] & ResponseStatus;

      expect(getFiatCurrencyResponse.__status).toBe(200);
    });

    it("should work even if credentials are passed", async () => {
      const consumerEmail = "test.consumer@noba.com";
      const consumerLoginResponse = await loginAndGetResponse(mongoUri, consumerEmail, "CONSUMER");
      setAccessTokenForTheNextRequests(consumerLoginResponse.accessToken);

      const signature = computeSignature(TEST_TIMESTAMP, "GET", "/v1/fiatcurrencies", JSON.stringify({}));
      const getFiatCurrencyResponse = (await AssetsService.supportedFiatCurrencies({
        xNobaApiKey: TEST_API_KEY,
        xNobaSignature: signature,
        xNobaTimestamp: TEST_TIMESTAMP,
      })) as CurrencyDTO[] & ResponseStatus;
      expect(getFiatCurrencyResponse.__status).toBe(200);
    });

    it("should return only 'US' currency", async () => {
      const signature = computeSignature(TEST_TIMESTAMP, "GET", "/v1/fiatcurrencies", JSON.stringify({}));
      const getFiatCurrencyResponse = (await AssetsService.supportedFiatCurrencies({
        xNobaApiKey: TEST_API_KEY,
        xNobaSignature: signature,
        xNobaTimestamp: TEST_TIMESTAMP,
      })) as CurrencyDTO[] & ResponseStatus;
      expect(getFiatCurrencyResponse.__status).toBe(200);

      const allTickers = [];
      Object.keys(getFiatCurrencyResponse).forEach(key => {
        if (key === "__status") return;
        allTickers.push(getFiatCurrencyResponse[key].ticker);
      });

      expect(allTickers.sort()).toEqual(["USD"].sort());
    });

    it("returned currencies list should have proper iconPath", async () => {
      const signature = computeSignature(TEST_TIMESTAMP, "GET", "/v1/fiatcurrencies", JSON.stringify({}));
      const getFiatCurrencyResponse = (await AssetsService.supportedFiatCurrencies({
        xNobaApiKey: TEST_API_KEY,
        xNobaSignature: signature,
        xNobaTimestamp: TEST_TIMESTAMP,
      })) as CurrencyDTO[] & ResponseStatus;
      expect(getFiatCurrencyResponse.__status).toBe(200);

      const receivedIconPaths = [];
      Object.keys(getFiatCurrencyResponse).forEach(key => {
        if (key === "__status") return;
        receivedIconPaths.push(getFiatCurrencyResponse[key].iconPath);
      });

      const expectedIconPaths = ["https://dj61eezhizi5l.cloudfront.net/assets/images/currency-logos/fiat/usd.svg"];

      expect(receivedIconPaths.sort()).toEqual(expectedIconPaths.sort());
    });

    it("should return 403 status code if signature is wrong", async () => {
      const signature = "some-random-signature";
      const getFiatCurrencyResponse = (await AssetsService.supportedFiatCurrencies({
        xNobaApiKey: TEST_API_KEY,
        xNobaSignature: signature,
        xNobaTimestamp: TEST_TIMESTAMP,
      })) as CurrencyDTO[] & ResponseStatus;
      expect(getFiatCurrencyResponse.__status).toBe(403);
    });
  });

  describe("GET /countries", () => {
    it("should work even if no credentials are passed", async () => {
      const signature = computeSignature(TEST_TIMESTAMP, "GET", "/v1/countries", JSON.stringify({}));
      const getSupportedCountriesResponse = (await AssetsService.getSupportedCountries({
        xNobaApiKey: TEST_API_KEY,
        xNobaSignature: signature,
        xNobaTimestamp: TEST_TIMESTAMP,
      })) as LocationDTO[] & ResponseStatus;

      expect(getSupportedCountriesResponse.__status).toBe(200);
    });

    it("should obtain 205 countries without subdivisions", async () => {
      const signature = computeSignature(TEST_TIMESTAMP, "GET", "/v1/countries", JSON.stringify({}));
      const getSupportedCountriesResponse = (await AssetsService.getSupportedCountries({
        xNobaApiKey: TEST_API_KEY,
        xNobaSignature: signature,
        xNobaTimestamp: TEST_TIMESTAMP,
      })) as LocationDTO[] & ResponseStatus;

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
      const signature = computeSignature(TEST_TIMESTAMP, "GET", "/v1/countries", JSON.stringify({}));
      const getSupportedCountriesResponse = (await AssetsService.getSupportedCountries({
        xNobaApiKey: TEST_API_KEY,
        xNobaSignature: signature,
        xNobaTimestamp: TEST_TIMESTAMP,
        includeSubdivisions: true,
      })) as LocationDTO[] & ResponseStatus;

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

    it("should return 403 status code if signature is wrong", async () => {
      const signature = "some-random-signature";
      const getSupportedCountriesResponse = (await AssetsService.getSupportedCountries({
        xNobaApiKey: TEST_API_KEY,
        xNobaSignature: signature,
        xNobaTimestamp: TEST_TIMESTAMP,
        includeSubdivisions: true,
      })) as LocationDTO[] & ResponseStatus;
      expect(getSupportedCountriesResponse.__status).toBe(403);
    });

    it("should return the deatils of a single country with subdivisions", async () => {
      const signature = computeSignature(TEST_TIMESTAMP, "GET", "/v1/countries/US", JSON.stringify({}));
      const us = (await AssetsService.getSupportedCountry({
        xNobaApiKey: TEST_API_KEY,
        xNobaSignature: signature,
        xNobaTimestamp: TEST_TIMESTAMP,
        countryCode: "US",
      })) as LocationDTO & ResponseStatus;
      expect(us.__status).toBe(200);

      expect(us.countryISOCode).toBe("US");
      expect(us.countryName).toBe("United States");
      expect(us.alternateCountryName).toBe("United States");
      expect(us.subdivisions.length).toBe(52);
      expect(us.subdivisions.find(element => element.code === "WA").code).toBe("WA");
      expect(us.subdivisions.find(element => element.code === "WA").name).toBe("Washington");
    });
  });

  describe("GET /config", () => {
    it("should return all api configurations", async () => {
      const signature = computeSignature(TEST_TIMESTAMP, "GET", "/v1/config", JSON.stringify({}));
      const config = (await AssetsService.getCommonConfigurations({
        xNobaApiKey: TEST_API_KEY,
        xNobaSignature: signature,
        xNobaTimestamp: TEST_TIMESTAMP,
      })) as ConfigurationsDTO & ResponseStatus;
      expect(config.__status).toBe(200);

      expect(config.lowAmountThreshold).toBe(0.25);
      expect(config.highAmountThreshold).toBe(75);
      expect(config.cryptoImageBaseUrl).toBe(
        "https://dj61eezhizi5l.cloudfront.net/assets/images/currency-logos/crypto",
      );
      expect(config.fiatImageBaseUrl).toBe("https://dj61eezhizi5l.cloudfront.net/assets/images/currency-logos/fiat");
    });

    it("should return 403 if signature is incorrect", async () => {
      const signature = "some-random-signature";
      const config = (await AssetsService.getCommonConfigurations({
        xNobaApiKey: TEST_API_KEY,
        xNobaSignature: signature,
        xNobaTimestamp: TEST_TIMESTAMP,
      })) as ConfigurationsDTO & ResponseStatus;
      expect(config.__status).toBe(403);
    });
  });
});
