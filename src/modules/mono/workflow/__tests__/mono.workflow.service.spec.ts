import { Test, TestingModule } from "@nestjs/testing";
import { MONO_CONFIG_KEY, MONO_NOBA_ACCOUNT_ID, SERVER_LOG_FILE_PATH } from "../../../../config/ConfigurationUtils";
import { TestConfigModule } from "../../../../core/utils/AppConfigModule";
import { getTestWinstonModule } from "../../../../core/utils/WinstonModule";
import { MonoAccountBalanceDTO } from "../../dto/mono.workflow.controller.dto";
import { anyString, anything, capture, instance, when } from "ts-mockito";
import { MonoService } from "../../public/mono.service";
import { getMockMonoServiceWithDefaults } from "../../public/mocks/mock.mono.service";
import { MonoWorkflowService } from "../mono.workflow.service";

describe("MonoWorkflowControllerTests", () => {
  jest.setTimeout(20000);

  let monoService: MonoService;
  let monoWorkflowService: MonoWorkflowService;
  let app: TestingModule;

  beforeEach(async () => {
    monoService = getMockMonoServiceWithDefaults();

    const appConfigurations = {
      [SERVER_LOG_FILE_PATH]: `/tmp/test-${Math.floor(Math.random() * 1000000)}.log`,
      [MONO_CONFIG_KEY]: {
        [MONO_NOBA_ACCOUNT_ID]: "12345678",
      },
    };
    // ***************** ENVIRONMENT VARIABLES CONFIGURATION *****************

    app = await Test.createTestingModule({
      imports: [TestConfigModule.registerAsync(appConfigurations), getTestWinstonModule()],
      providers: [
        {
          provide: MonoService,
          useFactory: () => instance(monoService),
        },
        MonoWorkflowService,
      ],
    }).compile();

    monoWorkflowService = app.get<MonoWorkflowService>(MonoWorkflowService);
  });

  afterEach(async () => {
    app.close();
  });

  describe("getNobaMonoAccountBalance", () => {
    it("should call the MonoService getBalance() method with 'Noba Account ID' and map the results correctly", async () => {
      when(monoService.getBalance(anyString())).thenResolve({
        balance: 1000,
        currency: "COP",
      });

      const response: MonoAccountBalanceDTO = await monoWorkflowService.getNobaMonoAccountBalance("ACCOUNT_ID");

      expect(response).toStrictEqual({
        accountID: "ACCOUNT_ID",
        amount: 1000,
        currency: "COP",
      });
      const [propagatedAccountID] = capture(monoService.getBalance).last();
      expect(propagatedAccountID).toBe("ACCOUNT_ID");
    });
  });
});
