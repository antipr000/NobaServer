import { Test, TestingModule } from "@nestjs/testing";
import { anything, capture, deepEqual, instance, when } from "ts-mockito";
import { TestConfigModule } from "../../../core/utils/AppConfigModule";
import { getTestWinstonModule } from "../../../core/utils/WinstonModule";
import { ExchangeRate, InputExchangeRate } from "../domain/ExchangeRate";
import { ExchangeRateDTO } from "../dto/exchangerate.dto";
import { ExchangeRateService } from "../exchangerate.service";
import { IExchangeRateRepo } from "../repo/exchangerate.repo";
import { ServiceException } from "../../../core/exception/service.exception";
import { AppEnvironment, NOBA_CONFIG_KEY } from "../../../config/ConfigurationUtils";
import { getMockExchangeRateRepoWithDefaults } from "../mocks/mock.exchangerate.repo";
import { getMockAlertServiceWithDefaults } from "../../../modules/common/mocks/mock.alert.service";
import { AlertService } from "../../../modules/common/alerts/alert.service";
import { ExchangeRateClientFactory } from "../factory/exchangerate.factory";
import { getMockExchangeRateClientFactoryWithDefaults } from "../mocks/mock.exchangerate.factory";
import { StubExchangeRateClient } from "../clients/stub.exchangerate.client";
import { AlertKey } from "../../../modules/common/alerts/alert.dto";
import { anyString } from "ts-mockito";
import { ExchangeRateIOExchangeRateClient } from "../clients/exchangerateio.exchangerate.client";
import { getMockExchangeRateIOExchangeRateClientWithDefaults } from "../mocks/mock.exchangerateio.exchangerate.client";

describe("ExchangeRateService", () => {
  let exchangeRateService: ExchangeRateService;
  let exchangeRateRepo: IExchangeRateRepo;
  let alertService: AlertService;
  let exchangeRateClientFactory: ExchangeRateClientFactory;
  let stubExchangeRateClient: StubExchangeRateClient;
  let mockExchangeRateClient: ExchangeRateIOExchangeRateClient;
  let app: TestingModule;

  jest.setTimeout(30000);

  beforeEach(async () => {
    exchangeRateRepo = getMockExchangeRateRepoWithDefaults();
    alertService = getMockAlertServiceWithDefaults();
    exchangeRateClientFactory = getMockExchangeRateClientFactoryWithDefaults();
    stubExchangeRateClient = new StubExchangeRateClient();
    mockExchangeRateClient = getMockExchangeRateIOExchangeRateClientWithDefaults();

    app = await Test.createTestingModule({
      imports: [
        TestConfigModule.registerAsync({
          [NOBA_CONFIG_KEY]: {
            environment: AppEnvironment.DEV,
          },
        }),
        getTestWinstonModule(),
      ],
      controllers: [],
      providers: [
        {
          provide: "ExchangeRateRepo",
          useFactory: () => instance(exchangeRateRepo),
        },
        {
          provide: AlertService,
          useFactory: () => instance(alertService),
        },
        {
          provide: ExchangeRateClientFactory,
          useFactory: () => instance(exchangeRateClientFactory),
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
      when(alertService.raiseCriticalAlert(anything())).thenResolve();

      const returnExchangeRate = await exchangeRateService.getExchangeRateForCurrencyPair("USD", "COP");

      const expectedExchangeRateDTO: ExchangeRateDTO = {
        numeratorCurrency: "USD",
        denominatorCurrency: "COP",
        bankRate: 4000,
        nobaRate: 3000,
        expirationTimestamp: new Date(createdTimestamp.getTime() - 36 * 60 * 60 * 1000), // 36 hours in the past
      };
      expect(returnExchangeRate).toStrictEqual(expectedExchangeRateDTO);

      const [alertCall] = capture(alertService.raiseCriticalAlert).last();
      expect(alertCall).toEqual(expect.objectContaining({ key: "STALE_FX_RATES" }));
    });

    it("Should return null when an error is thrown", async () => {
      when(exchangeRateRepo.getExchangeRateForCurrencyPair("XXX", "YYY", deepEqual(new Date()))).thenThrow(
        new Error("Error getting exchange rate"),
      );

      const returnExchangeRate = await exchangeRateService.getExchangeRateForCurrencyPair("XXX", "YYY");

      expect(returnExchangeRate).toBe(null);
    });
  });

  describe("createExchangeRateFromProvider", () => {
    it("Should create an exchange rate", async () => {
      const createdTimestamp = new Date();
      const updatedTimestamp = new Date();
      const id = "exchange-rate-1";

      const exchangeRateDTO = {
        numeratorCurrency: "USD",
        denominatorCurrency: "COP",
        bankRate: 4000,
        nobaRate: 4000,
        expirationTimestamp: new Date(createdTimestamp.getTime() + 25 * 60 * 60 * 1000), // 25 hours from now
      };

      const exchangeRateDTOInverse = {
        numeratorCurrency: "COP",
        denominatorCurrency: "USD",
        bankRate: 0.00025,
        nobaRate: 0.00025,
        expirationTimestamp: new Date(createdTimestamp.getTime() + 25 * 60 * 60 * 1000), // 25 hours from now
      };

      const exchangeRate: ExchangeRate = {
        id: id,
        createdTimestamp: createdTimestamp,
        updatedTimestamp: updatedTimestamp,
        ...exchangeRateDTO,
      };

      const exchangeRateInverse: ExchangeRate = {
        id: id,
        createdTimestamp: createdTimestamp,
        updatedTimestamp: updatedTimestamp,
        ...exchangeRateDTOInverse,
      };

      const returnedExchangeRateClient = stubExchangeRateClient;

      when(exchangeRateClientFactory.getExchangeRateClientByCurrencyPair("USD", "COP")).thenReturn(
        returnedExchangeRateClient,
      );
      when(exchangeRateClientFactory.getExchangeRateClientByCurrencyPair("COP", "USD")).thenReturn(
        returnedExchangeRateClient,
      );

      when(exchangeRateRepo.createExchangeRate(deepEqual(exchangeRateDTO))).thenResolve(exchangeRate);
      when(exchangeRateRepo.createExchangeRate(deepEqual(exchangeRateDTOInverse))).thenResolve(exchangeRateInverse);

      const returnExchangeRate = await exchangeRateService.createExchangeRateFromProvider();

      expect(returnExchangeRate).toStrictEqual([exchangeRateDTO, exchangeRateDTOInverse]);
    });

    it("Should return empty when unable to find any exchange rate clients", async () => {
      when(exchangeRateClientFactory.getExchangeRateClientByCurrencyPair("USD", "COP")).thenReturn(null);
      when(exchangeRateClientFactory.getExchangeRateClientByCurrencyPair("COP", "USD")).thenReturn(null);

      when(
        alertService.raiseCriticalAlert(deepEqual({ key: AlertKey.EXCHANGE_RATE_UPDATE_FAILED, message: anyString() })),
      ).thenResolve();

      const returnExchangeRate = await exchangeRateService.createExchangeRateFromProvider();

      expect(returnExchangeRate).toStrictEqual([]);
    });

    it("Should return one when only able to find one exchange rate client", async () => {
      const createdTimestamp = new Date();
      const updatedTimestamp = new Date();
      const id = "exchange-rate-1";

      const exchangeRateDTO = {
        numeratorCurrency: "USD",
        denominatorCurrency: "COP",
        bankRate: 4000,
        nobaRate: 4000,
        expirationTimestamp: new Date(createdTimestamp.getTime() + 25 * 60 * 60 * 1000), // 25 hours from now
      };

      const exchangeRate: ExchangeRate = {
        id: id,
        createdTimestamp: createdTimestamp,
        updatedTimestamp: updatedTimestamp,
        ...exchangeRateDTO,
      };

      const returnedExchangeRateClient = stubExchangeRateClient;

      when(exchangeRateClientFactory.getExchangeRateClientByCurrencyPair("USD", "COP")).thenReturn(
        returnedExchangeRateClient,
      );
      when(exchangeRateClientFactory.getExchangeRateClientByCurrencyPair("COP", "USD")).thenReturn(null);

      when(exchangeRateRepo.createExchangeRate(deepEqual(exchangeRateDTO))).thenResolve(exchangeRate);
      when(
        alertService.raiseCriticalAlert(deepEqual({ key: AlertKey.EXCHANGE_RATE_UPDATE_FAILED, message: anyString() })),
      ).thenResolve();

      const returnExchangeRate = await exchangeRateService.createExchangeRateFromProvider();

      expect(returnExchangeRate).toStrictEqual([exchangeRateDTO]);
    });

    it("Should raise alert when error thrown by provider to get exchange rate", async () => {
      const returnedExchangeRateClient = mockExchangeRateClient;

      when(exchangeRateClientFactory.getExchangeRateClientByCurrencyPair("USD", "COP")).thenReturn(
        instance(returnedExchangeRateClient),
      );
      when(exchangeRateClientFactory.getExchangeRateClientByCurrencyPair("COP", "USD")).thenReturn(
        instance(returnedExchangeRateClient),
      );

      when(returnedExchangeRateClient.getExchangeRate("USD", "COP")).thenThrow(
        new Error("Error getting exchange rate"),
      );
      when(returnedExchangeRateClient.getExchangeRate("COP", "USD")).thenThrow(
        new Error("Error getting exchange rate"),
      );

      when(
        alertService.raiseCriticalAlert(deepEqual({ key: AlertKey.EXCHANGE_RATE_UPDATE_FAILED, message: anyString() })),
      ).thenResolve();

      const returnExchangeRate = await exchangeRateService.createExchangeRateFromProvider();

      expect(returnExchangeRate).toStrictEqual([]);
    });

    it("Should raise alert when exchange rate from provider is null/undefined", async () => {
      const returnedExchangeRateClient = mockExchangeRateClient;

      when(exchangeRateClientFactory.getExchangeRateClientByCurrencyPair("USD", "COP")).thenReturn(
        instance(returnedExchangeRateClient),
      );
      when(exchangeRateClientFactory.getExchangeRateClientByCurrencyPair("COP", "USD")).thenReturn(
        instance(returnedExchangeRateClient),
      );

      when(returnedExchangeRateClient.getExchangeRate("USD", "COP")).thenResolve(null);
      when(returnedExchangeRateClient.getExchangeRate("COP", "USD")).thenResolve(undefined);

      when(
        alertService.raiseCriticalAlert(deepEqual({ key: AlertKey.EXCHANGE_RATE_UPDATE_FAILED, message: anyString() })),
      ).thenResolve();

      const returnExchangeRate = await exchangeRateService.createExchangeRateFromProvider();

      expect(returnExchangeRate).toStrictEqual([]);
    });

    it("Should raise alert when exchange rate from provider is outside of threshold", async () => {
      const returnedExchangeRateClient = mockExchangeRateClient;

      when(exchangeRateClientFactory.getExchangeRateClientByCurrencyPair("USD", "COP")).thenReturn(
        instance(returnedExchangeRateClient),
      );
      when(exchangeRateClientFactory.getExchangeRateClientByCurrencyPair("COP", "USD")).thenReturn(
        instance(returnedExchangeRateClient),
      );

      when(returnedExchangeRateClient.getExchangeRate("USD", "COP")).thenResolve(5000);
      when(returnedExchangeRateClient.getExchangeRate("COP", "USD")).thenResolve(0.0002);

      when(exchangeRateRepo.getExchangeRateForCurrencyPair("USD", "COP")).thenResolve({
        id: "exchange-rate-1",
        createdTimestamp: new Date(),
        updatedTimestamp: new Date(),
        numeratorCurrency: "USD",
        denominatorCurrency: "COP",
        bankRate: 4000,
        nobaRate: 4000,
        expirationTimestamp: new Date(),
      });
      when(exchangeRateRepo.getExchangeRateForCurrencyPair("COP", "USD")).thenResolve({
        id: "exchange-rate-2",
        createdTimestamp: new Date(),
        updatedTimestamp: new Date(),
        numeratorCurrency: "COP",
        denominatorCurrency: "USD",
        bankRate: 0.00025,
        nobaRate: 0.00025,
        expirationTimestamp: new Date(),
      });

      when(
        alertService.raiseCriticalAlert(deepEqual({ key: AlertKey.EXCHANGE_RATE_UPDATE_FAILED, message: anyString() })),
      ).thenResolve();

      const returnExchangeRate = await exchangeRateService.createExchangeRateFromProvider();

      expect(returnExchangeRate).toStrictEqual([]);
    });
  });
});
