import { Test, TestingModule } from "@nestjs/testing";
import { deepEqual, instance, when } from "ts-mockito";
import { TestConfigModule } from "../../../core/utils/AppConfigModule";
import { getTestWinstonModule } from "../../../core/utils/WinstonModule";
import { ExchangeRate, InputExchangeRate } from "../domain/ExchangeRate";
import { ExchangeRateDTO } from "../dto/ExchangeRateDTO";
import { ExchangeRateService } from "../exchangerate.service";
import { getMockExchangeRateRepoWithDefaults } from "../mocks/mock.exchangerate.repo";
import { IExchangeRateRepo } from "../repo/exchangerate.repo";
import { ServiceException } from "../../../core/exception/service.exception";
import * as alertUtils from "../alerts/alert.dto";

describe("ExchangeRateService", () => {
  let exchangeRateService: ExchangeRateService;
  let exchangeRateRepo: IExchangeRateRepo;
  let app: TestingModule;

  jest.setTimeout(30000);

  beforeAll(async () => {
    exchangeRateRepo = getMockExchangeRateRepoWithDefaults();
    app = await Test.createTestingModule({
      imports: [TestConfigModule.registerAsync({}), getTestWinstonModule()],
      controllers: [],
      providers: [
        {
          provide: "ExchangeRateRepo",
          useFactory: () => instance(exchangeRateRepo),
        },
        ExchangeRateService,
      ],
    }).compile();

    exchangeRateService = app.get<ExchangeRateService>(ExchangeRateService);

    jest.useFakeTimers();
    jest.setSystemTime(new Date(2020, 3, 1));
  });

  afterAll(async () => {
    jest.useRealTimers();
    await app.close();
  });

  afterEach(() => {
    jest.resetAllMocks();
  });

  describe("createExchangeRate", () => {
    it("Should create an exchange rate with no error", async () => {
      const exchangeRateDTO: ExchangeRateDTO = {
        numeratorCurrency: "USD",
        denominatorCurrency: "COP",
        bankRate: 5000,
        nobaRate: 4000,
        expirationTimestamp: new Date(Date.now() + 36 * 60 * 60 * 1000), // 36 hours from now
      };

      when(
        exchangeRateRepo.createExchangeRate(
          deepEqual({
            numeratorCurrency: exchangeRateDTO.numeratorCurrency,
            denominatorCurrency: exchangeRateDTO.denominatorCurrency,
            bankRate: exchangeRateDTO.bankRate,
            nobaRate: exchangeRateDTO.nobaRate,
            expirationTimestamp: exchangeRateDTO.expirationTimestamp,
          }),
        ),
      ).thenResolve({
        id: "exchange-rate-1",
        createdTimestamp: new Date(),
        updatedTimestamp: new Date(),
        numeratorCurrency: exchangeRateDTO.numeratorCurrency,
        denominatorCurrency: exchangeRateDTO.denominatorCurrency,
        bankRate: exchangeRateDTO.bankRate,
        nobaRate: exchangeRateDTO.nobaRate,
        expirationTimestamp: exchangeRateDTO.expirationTimestamp,
      });

      const createdDTO = await exchangeRateService.createExchangeRate(exchangeRateDTO);
      expect(createdDTO).not.toBeNull();
      expect(createdDTO).not.toBeUndefined();
      expect(createdDTO).toStrictEqual(exchangeRateDTO);
    });

    it("Should return null if exchange rate couldn't be saved and an exception is not thrown", async () => {
      const exchangeRateDTO: ExchangeRateDTO = {
        numeratorCurrency: "USD",
        denominatorCurrency: "COP",
        bankRate: 5000,
        nobaRate: 4000,
        expirationTimestamp: new Date(new Date().getTime() + 36 * 60 * 60 * 1000), // 36 hours from now
      };

      when(
        exchangeRateRepo.createExchangeRate(
          deepEqual({
            numeratorCurrency: exchangeRateDTO.numeratorCurrency,
            denominatorCurrency: exchangeRateDTO.denominatorCurrency,
            bankRate: exchangeRateDTO.bankRate,
            nobaRate: exchangeRateDTO.nobaRate,
            expirationTimestamp: exchangeRateDTO.expirationTimestamp,
          }),
        ),
      ).thenResolve(null);

      const createdDTO = await exchangeRateService.createExchangeRate(exchangeRateDTO);
      expect(createdDTO).toBeNull();
    });

    it("Should throw a ServiceException if unknown exception is thrown during save", async () => {
      const exchangeRateDTO: ExchangeRateDTO = {
        numeratorCurrency: "USD",
        denominatorCurrency: "COP",
        bankRate: 5000,
        nobaRate: 4000,
        expirationTimestamp: new Date(new Date().getTime() + 36 * 60 * 60 * 1000), // 36 hours from now
      };

      when(
        exchangeRateRepo.createExchangeRate(
          deepEqual({
            numeratorCurrency: exchangeRateDTO.numeratorCurrency,
            denominatorCurrency: exchangeRateDTO.denominatorCurrency,
            bankRate: exchangeRateDTO.bankRate,
            nobaRate: exchangeRateDTO.nobaRate,
            expirationTimestamp: exchangeRateDTO.expirationTimestamp,
          }),
        ),
      ).thenThrow(new Error("Error creating exchange rate"));

      expect(async () => await exchangeRateService.createExchangeRate(exchangeRateDTO)).rejects.toThrow(
        ServiceException,
      );
    });

    it("Should set nobaRate to bankRate if nobaRate not provided", async () => {
      const exchangeRateDTO: ExchangeRateDTO = {
        numeratorCurrency: "USD",
        denominatorCurrency: "COP",
        bankRate: 5000,
        expirationTimestamp: new Date(new Date().getTime() + 36 * 60 * 60 * 1000), // 36 hours from now
      };

      when(
        exchangeRateRepo.createExchangeRate(
          deepEqual({
            numeratorCurrency: exchangeRateDTO.numeratorCurrency,
            denominatorCurrency: exchangeRateDTO.denominatorCurrency,
            bankRate: exchangeRateDTO.bankRate,
            nobaRate: exchangeRateDTO.bankRate, // Intentionally bankRate here
            expirationTimestamp: exchangeRateDTO.expirationTimestamp,
          }),
        ),
      ).thenResolve();

      await exchangeRateService.createExchangeRate(exchangeRateDTO);

      expect(true).toBe(true);
    });

    it("Should set expirationTimestamp to 36 hours from now if not provided", async () => {
      const currentTime = Date.now();
      const tomorrowTime = new Date(currentTime + 36 * 60 * 60 * 1000);
      const exchangeRateDTO: ExchangeRateDTO = {
        numeratorCurrency: "USD",
        denominatorCurrency: "COP",
        bankRate: 5000,
        nobaRate: 4000,
      };

      const inputExchangeRate: InputExchangeRate = {
        numeratorCurrency: exchangeRateDTO.numeratorCurrency,
        denominatorCurrency: exchangeRateDTO.denominatorCurrency,
        bankRate: exchangeRateDTO.bankRate,
        nobaRate: exchangeRateDTO.nobaRate,
        expirationTimestamp: tomorrowTime,
      };

      const createdExchangeRate: ExchangeRate = {
        ...inputExchangeRate,
        id: "exchange-rate-1",
        createdTimestamp: new Date(),
        updatedTimestamp: new Date(),
      };

      when(exchangeRateRepo.createExchangeRate(deepEqual(inputExchangeRate))).thenResolve(createdExchangeRate);

      const newExchangeRate = await exchangeRateService.createExchangeRate(exchangeRateDTO);

      expect(newExchangeRate).toEqual({
        numeratorCurrency: exchangeRateDTO.numeratorCurrency,
        denominatorCurrency: exchangeRateDTO.denominatorCurrency,
        bankRate: exchangeRateDTO.bankRate,
        nobaRate: exchangeRateDTO.nobaRate,
        expirationTimestamp: tomorrowTime,
      });
    });
  });

  describe("getExchangeRateForCurrencyPair", () => {
    it("Should get an exchange rate with no error", async () => {
      const createdTimestamp = new Date();
      const updatedTimestamp = new Date();
      const id = "exchange-rate-1";

      const exchangeRate: ExchangeRate = {
        id: id,
        createdTimestamp: createdTimestamp,
        updatedTimestamp: updatedTimestamp,
        numeratorCurrency: "USD",
        denominatorCurrency: "COP",
        bankRate: 5000,
        nobaRate: 4000,
        expirationTimestamp: new Date(createdTimestamp.getTime() + 36 * 60 * 60 * 1000), // 36 hours from now
      };

      when(exchangeRateRepo.getExchangeRateForCurrencyPair("USD", "COP", deepEqual(new Date()))).thenResolve(
        exchangeRate,
      );

      const returnExchangeRate = await exchangeRateService.getExchangeRateForCurrencyPair("USD", "COP");

      const expectedExchangeRateDTO: ExchangeRateDTO = {
        numeratorCurrency: "USD",
        denominatorCurrency: "COP",
        bankRate: 5000,
        nobaRate: 4000,
        expirationTimestamp: new Date(createdTimestamp.getTime() + 36 * 60 * 60 * 1000), // 36 hours from now
      };

      expect(returnExchangeRate).toStrictEqual(expectedExchangeRateDTO);
    });

    it("Should return null when unable to find any exchange rate", async () => {
      when(exchangeRateRepo.getExchangeRateForCurrencyPair("USD", "XXX", deepEqual(new Date()))).thenResolve(null);

      const returnExchangeRate = await exchangeRateService.getExchangeRateForCurrencyPair("USD", "XXX");

      expect(returnExchangeRate).toBe(null);
    });

    it("Should return most recently-expired exchange rate when unable to find current exchange rate", async () => {
      const createdTimestamp = new Date();
      const updatedTimestamp = new Date();
      const id = "exchange-rate-1";

      const expiredExchangeRate: ExchangeRate = {
        id: id,
        createdTimestamp: createdTimestamp,
        updatedTimestamp: updatedTimestamp,
        numeratorCurrency: "USD",
        denominatorCurrency: "COP",
        bankRate: 4000,
        nobaRate: 3000,
        expirationTimestamp: new Date(createdTimestamp.getTime() - 36 * 60 * 60 * 1000), // 36 hours in the past
      };

      when(exchangeRateRepo.getExchangeRateForCurrencyPair("USD", "COP", deepEqual(new Date()))).thenResolve(null);
      when(exchangeRateRepo.getExchangeRateForCurrencyPair("USD", "COP")).thenResolve(expiredExchangeRate);
      const alertLogSpy = jest.spyOn(alertUtils, "formatAlertLog");

      const returnExchangeRate = await exchangeRateService.getExchangeRateForCurrencyPair("USD", "COP");

      const expectedExchangeRateDTO: ExchangeRateDTO = {
        numeratorCurrency: "USD",
        denominatorCurrency: "COP",
        bankRate: 4000,
        nobaRate: 3000,
        expirationTimestamp: new Date(createdTimestamp.getTime() - 36 * 60 * 60 * 1000), // 36 hours in the past
      };

      expect(alertLogSpy).toHaveBeenCalledWith(expect.objectContaining({ key: "STALE_FX_RATES" }));
      expect(returnExchangeRate).toStrictEqual(expectedExchangeRateDTO);
    });

    it("Should return null when an error is thrown", async () => {
      when(exchangeRateRepo.getExchangeRateForCurrencyPair("XXX", "YYY", deepEqual(new Date()))).thenThrow(
        new Error("Error getting exchange rate"),
      );

      const returnExchangeRate = await exchangeRateService.getExchangeRateForCurrencyPair("XXX", "YYY");

      expect(returnExchangeRate).toBe(null);
    });
  });
});
