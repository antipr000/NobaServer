import { Test, TestingModule } from "@nestjs/testing";
import { SERVER_LOG_FILE_PATH } from "../../../config/ConfigurationUtils";
import { TestConfigModule } from "../../../core/utils/AppConfigModule";
import { getTestWinstonModule } from "../../../core/utils/WinstonModule";
import { instance } from "ts-mockito";
import { BankFactory } from "../factory/bank.factory";
import { getMockCircleServiceWithDefaults } from "../../circle/public/mocks/mock.circle.service";
import { IBank } from "../factory/ibank";
import { BankName } from "../domain/BankFactoryTypes";
import { CircleService } from "../../../modules/circle/public/circle.service";
import { getMockMonoServiceWithDefaults } from "src/modules/mono/public/mocks/mock.mono.service";
import { MonoService } from "src/modules/mono/public/mono.service";

describe("BankFactory Tests", () => {
  jest.setTimeout(20000);

  let app: TestingModule;
  let bankFactory: BankFactory;
  let monoService: IBank;
  let circleService: IBank;

  beforeAll(async () => {
    monoService = instance(getMockMonoServiceWithDefaults());
    circleService = instance(getMockCircleServiceWithDefaults());
    const appConfigurations = {
      [SERVER_LOG_FILE_PATH]: `/tmp/test-${Math.floor(Math.random() * 1000000)}.log`,
    };
    // ***************** ENVIRONMENT VARIABLES CONFIGURATION *****************

    app = await Test.createTestingModule({
      imports: [TestConfigModule.registerAsync(appConfigurations), getTestWinstonModule()],
      providers: [
        {
          provide: MonoService,
          useFactory: () => monoService,
        },
        {
          provide: CircleService,
          useFactory: () => circleService,
        },
        BankFactory,
      ],
    }).compile();

    bankFactory = app.get<BankFactory>(BankFactory);
  });

  afterAll(async () => {
    await app.close();
  });

  describe("getBankImplementationByCurrency", () => {
    it("should return MonoWorkflowService when currency is COP", () => {
      const bank = bankFactory.getBankImplementationByCurrency("COP");
      expect(bank).toBe(monoService);
    });
    it("should return CircleService when currency is USD", () => {
      const bank = bankFactory.getBankImplementationByCurrency("USD");
      expect(bank).toBe(circleService);
    });
  });

  describe("getBankImplementation", () => {
    it("should return MonoWorkflowService when bank is MONO", () => {
      const bank = bankFactory.getBankImplementation(BankName.MONO);
      expect(bank).toBe(monoService);
    });
    it("should return CircleService when bank is CIRCLE", () => {
      const bank = bankFactory.getBankImplementation(BankName.CIRCLE);
      expect(bank).toBe(circleService);
    });
  });
});
