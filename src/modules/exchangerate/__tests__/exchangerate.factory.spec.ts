import { Test, TestingModule } from "@nestjs/testing";
import { SERVER_LOG_FILE_PATH } from "../../../config/ConfigurationUtils";
import { TestConfigModule } from "../../../core/utils/AppConfigModule";
import { getTestWinstonModule } from "../../../core/utils/WinstonModule";
import { instance, when } from "ts-mockito";
import { ExchangeRateService } from "../exchangerate.service";
import { ExchangeRateWorkflowController } from "../workflow/exchangerate.workflow.controller";
import { getMockExchangeRateServiceWithDefaults } from "../mocks/mock.exchangerate.service";
import { ExchangeRateClientFactory } from "../factory/exchangerate.factory";
import { StubExchangeRateClient } from "../clients/stub.exchangerate.client";
import { ExchangeRateIOExchangeRateClient } from "../clients/exchangerateio.exchangerate.client";
import { getMockExchangeRateIOExchangeRateClientWithDefaults } from "../mocks/mock.exchangerateio.exchangerate.client";

describe("ExchangeRateFactoryTests", () => {
  jest.setTimeout(20000);

  let app: TestingModule;
  let stubClient: StubExchangeRateClient;
  let exchangeRateFactory: ExchangeRateClientFactory;
  let mockExchangeRateIOClient: ExchangeRateIOExchangeRateClient;

  beforeEach(async () => {
    stubClient = new StubExchangeRateClient();
    mockExchangeRateIOClient = getMockExchangeRateIOExchangeRateClientWithDefaults();

    const appConfigurations = {
      [SERVER_LOG_FILE_PATH]: `/tmp/test-${Math.floor(Math.random() * 1000000)}.log`,
    };
    // ***************** ENVIRONMENT VARIABLES CONFIGURATION *****************

    app = await Test.createTestingModule({
      imports: [TestConfigModule.registerAsync(appConfigurations), getTestWinstonModule()],
      providers: [
        {
          provide: ExchangeRateService,
          useFactory: () => instance(mockExchangeRateService),
        },
        ExchangeRateClientFactory,
      ],
    }).compile();

    exchangeRateFactory = app.get<ExchangeRateClientFactory>(ExchangeRateClientFactory);
  });

  afterEach(async () => {
    jest.useRealTimers();
    app.close();
  });

  describe("createExchangeRate", () => {
    it("should return a new exchange rate", async () => {
      when(mockExchangeRateService.createExchangeRateFromProvider()).thenResolve([
        {
          numeratorCurrency: "USD",
          denominatorCurrency: "EUR",
          bankRate: 0.8,
        },
      ]);

      const result = await exchangeRateWorkflowController.createExchangeRate();

      expect(result).toEqual([
        {
          numeratorCurrency: "USD",
          denominatorCurrency: "EUR",
          bankRate: 0.8,
        },
      ]);
    });

    it("should return an error if the exchange rate cannot be created", async () => {
      when(mockExchangeRateService.createExchangeRateFromProvider()).thenReject(
        new Error("Cannot create exchange rate"),
      );

      await expect(exchangeRateWorkflowController.createExchangeRate()).rejects.toThrowError(
        "Cannot create exchange rate",
      );
    });
  });
});
