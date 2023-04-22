import { Test, TestingModule } from "@nestjs/testing";
import { SERVER_LOG_FILE_PATH } from "../../../config/ConfigurationUtils";
import { TestConfigModule } from "../../../core/utils/AppConfigModule";
import { getTestWinstonModule } from "../../../core/utils/WinstonModule";
import { instance } from "ts-mockito";
import { ExchangeRateClientFactory } from "../factory/exchangerate.factory";
import { StubExchangeRateClient } from "../clients/stub.exchangerate.client";
import { ExchangeRateIOExchangeRateClient } from "../clients/exchangerateio.exchangerate.client";
import { getMockExchangeRateIOExchangeRateClientWithDefaults } from "../mocks/mock.exchangerateio.exchangerate.client";
import { ExchangeRateName } from "../domain/ExchangeRate";
import { IExchangeRateClient } from "../clients/exchangerate.client";

describe("ExchangeRateFactoryTests", () => {
  jest.setTimeout(20000);

  let app: TestingModule;
  let stubClient: IExchangeRateClient;
  let exchangeRateFactory: ExchangeRateClientFactory;
  let mockExchangeRateIOClient: IExchangeRateClient;

  beforeEach(async () => {
    stubClient = instance(new StubExchangeRateClient());
    mockExchangeRateIOClient = instance(getMockExchangeRateIOExchangeRateClientWithDefaults());

    const appConfigurations = {
      [SERVER_LOG_FILE_PATH]: `/tmp/test-${Math.floor(Math.random() * 1000000)}.log`,
    };
    // ***************** ENVIRONMENT VARIABLES CONFIGURATION *****************

    app = await Test.createTestingModule({
      imports: [TestConfigModule.registerAsync(appConfigurations), getTestWinstonModule()],
      providers: [
        {
          provide: ExchangeRateIOExchangeRateClient,
          useFactory: () => mockExchangeRateIOClient,
        },
        {
          provide: StubExchangeRateClient,
          useFactory: () => stubClient,
        },
        ExchangeRateClientFactory,
      ],
    }).compile();

    exchangeRateFactory = app.get<ExchangeRateClientFactory>(ExchangeRateClientFactory);
  });

  afterEach(async () => {
    await app.close();
  });

  describe("getExchangeRateClient", () => {
    it("should return a StubExchangeRateClient", async () => {
      const client = exchangeRateFactory.getExchangeRateClient(ExchangeRateName.STUB);
      expect(client).toBe(stubClient);
    });

    it("should return a ExchangeRateIOExchangeRateClient", async () => {
      const client = exchangeRateFactory.getExchangeRateClient(ExchangeRateName.EXCHANGERATEIO);
      expect(client).toBe(mockExchangeRateIOClient);
    });
  });

  describe("getExchangeRateClientByCurrencyPair", () => {
    it("should return a StubExchangeRateClient", async () => {
      const client = exchangeRateFactory.getExchangeRateClientByCurrencyPair("COP", "USD");
      expect(client).toBe(mockExchangeRateIOClient);
    });

    it("should return a ExchangeRateIOExchangeRateClient", async () => {
      const client = exchangeRateFactory.getExchangeRateClientByCurrencyPair("USD", "COP");
      expect(client).toBe(mockExchangeRateIOClient);
    });
  });
});
