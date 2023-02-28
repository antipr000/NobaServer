import { Test, TestingModule } from "@nestjs/testing";
import { SERVER_LOG_FILE_PATH } from "../../../config/ConfigurationUtils";
import { TestConfigModule } from "../../../core/utils/AppConfigModule";
import { getTestWinstonModule } from "../../../core/utils/WinstonModule";
import { instance } from "ts-mockito";
import { BankFactory } from "../factory/bank.factory";
import { getMockBankMonoImplWithDefaults } from "../mocks/mock.bank.mono.impl";
import { BankName } from "../domain/BankFactoryTypes";
import { ServiceException } from "../../../core/exception/service.exception";
import { MonoWorkflowService } from "../mono/mono.workflow.service";
import { getMockMonoWorkflowServiceWithDefaults } from "../mono/mocks/mock.mono.workflow.service";

describe("BankFactory Tests", () => {
  jest.setTimeout(20000);

  let app: TestingModule;
  let bankFactory: BankFactory;
  let monoWorkflowService: MonoWorkflowService;

  beforeAll(async () => {
    monoWorkflowService = instance(getMockMonoWorkflowServiceWithDefaults());
    const appConfigurations = {
      [SERVER_LOG_FILE_PATH]: `/tmp/test-${Math.floor(Math.random() * 1000000)}.log`,
    };
    // ***************** ENVIRONMENT VARIABLES CONFIGURATION *****************

    app = await Test.createTestingModule({
      imports: [TestConfigModule.registerAsync(appConfigurations), getTestWinstonModule()],
      providers: [
        {
          provide: MonoWorkflowService,
          useFactory: () => monoWorkflowService,
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
    it("should return BankMonoImpl when currency is COP", () => {
      const workflow = bankFactory.getBankImplementationByCurrency("COP");
      expect(workflow).toBe(monoWorkflowService);
    });
  });
});
