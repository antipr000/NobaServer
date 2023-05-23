import { Test, TestingModule } from "@nestjs/testing";
import { SERVER_LOG_FILE_PATH } from "../../../../config/ConfigurationUtils";
import { TestConfigModule } from "../../../../core/utils/AppConfigModule";
import { getTestWinstonModule } from "../../../../core/utils/WinstonModule";
import { anything, capture, instance, when } from "ts-mockito";
import { PomeloTransaction } from "../../domain/PomeloTransaction";
import { uuid } from "uuidv4";
import { PomeloWorkflowService } from "../pomelo.workflow.service";
import { PomeloRepo } from "../../repos/pomelo.repo";
import { getMockPomeloRepoWithDefaults } from "../../repos/mocks/mock.pomelo.repo";
import { POMELO_REPO_PROVIDER } from "../../repos/pomelo.repo.module";
import { getRandomPomeloTransaction } from "../../public/test_utils/util";

describe("PomeloWorkflowServiceTests", () => {
  jest.setTimeout(20000);

  let workflowService: PomeloWorkflowService;
  let mockPomeloRepo: PomeloRepo;

  let app: TestingModule;

  beforeEach(async () => {
    mockPomeloRepo = getMockPomeloRepoWithDefaults();

    const appConfigurations = {
      [SERVER_LOG_FILE_PATH]: `/tmp/test-${Math.floor(Math.random() * 1000000)}.log`,
    };
    // ***************** ENVIRONMENT VARIABLES CONFIGURATION *****************

    app = await Test.createTestingModule({
      imports: [TestConfigModule.registerAsync(appConfigurations), getTestWinstonModule()],
      providers: [
        {
          provide: POMELO_REPO_PROVIDER,
          useFactory: () => instance(mockPomeloRepo),
        },
        PomeloWorkflowService,
      ],
    }).compile();

    workflowService = app.get<PomeloWorkflowService>(PomeloWorkflowService);
  });

  afterEach(async () => {
    app.close();
  });

  describe("getPomeloTransactionByPomeloTransactionID", () => {
    const POMELO_CARD_ID = "POMELO_CARD_ID";
    const POMELO_USER_ID = "POMELO_USER_ID";
    const NOBA_TRANSACTION_ID = "NOBA_TRANSACTION_ID";
    const pomeloTransaction: PomeloTransaction = getRandomPomeloTransaction(
      POMELO_CARD_ID,
      POMELO_USER_ID,
      NOBA_TRANSACTION_ID,
    );

    it("should return null if the is not found", async () => {
      const pomelotransactionID = uuid();
      when(mockPomeloRepo.getPomeloTransactionByPomeloTransactionID(pomelotransactionID)).thenResolve(null);

      const response: PomeloTransaction = await workflowService.getPomeloTransactionByPomeloTransactionID(
        pomelotransactionID,
      );

      expect(response).toBe(null);
    });

    it("should forwards the response as-is from the repo layer", async () => {
      when(mockPomeloRepo.getPomeloTransactionByPomeloTransactionID(pomeloTransaction.pomeloTransactionID)).thenResolve(
        pomeloTransaction,
      );

      const response: PomeloTransaction = await workflowService.getPomeloTransactionByPomeloTransactionID(
        pomeloTransaction.pomeloTransactionID,
      );

      expect(response).toStrictEqual(pomeloTransaction);
    });
  });

  describe("getPomeloUserTransactionsForSettlementDate", () => {
    const POMELO_CARD_ID = "POMELO_CARD_ID";
    const POMELO_USER_ID = "POMELO_USER_ID";
    const NOBA_TRANSACTION_ID = "NOBA_TRANSACTION_ID";
    const pomeloTransaction: PomeloTransaction = getRandomPomeloTransaction(
      POMELO_CARD_ID,
      POMELO_USER_ID,
      NOBA_TRANSACTION_ID,
    );

    it("should forwards the response as-is from the repo layer", async () => {
      when(mockPomeloRepo.getPomeloUserTransactionsForSettlementDate(POMELO_USER_ID, "2023-05-23")).thenResolve([
        pomeloTransaction,
      ]);

      const response: PomeloTransaction[] = await workflowService.getPomeloUserTransactionsForSettlementDate(
        POMELO_USER_ID,
        "2023-05-23",
      );

      expect(response).toStrictEqual([pomeloTransaction]);
    });
  });
});
