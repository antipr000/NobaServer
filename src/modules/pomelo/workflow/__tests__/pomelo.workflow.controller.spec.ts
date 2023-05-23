import { Test, TestingModule } from "@nestjs/testing";
import { SERVER_LOG_FILE_PATH } from "../../../../config/ConfigurationUtils";
import { TestConfigModule } from "../../../../core/utils/AppConfigModule";
import { getTestWinstonModule } from "../../../../core/utils/WinstonModule";
import { anything, capture, deepEqual, instance, when } from "ts-mockito";
import { PomeloTransaction } from "../../domain/PomeloTransaction";
import { PomeloWorkflowController } from "../pomelo.workflow.controller";
import { PomeloWorkflowMapper } from "../pomelo.workflow.mapper";
import { PomeloWorkflowService } from "../pomelo.workflow.service";
import { getMockPomeloWorkflowMapperWithDefaults } from "../mocks/mock.pomelo.workflow.mapper";
import { getMockPomeloWorkflowServiceWithDefaults } from "../mocks/mock.pomelo.workflow.service";
import { getRandomPomeloTransaction } from "../../public/test_utils/util";
import { PomeloTransactionDTO, PomeloTransactionsDTO } from "../../dto/pomelo.workflow.controller.dto";
import { NotFoundException } from "@nestjs/common";
import { uuid } from "uuidv4";

describe("PomeloWorkflowControllerTests", () => {
  jest.setTimeout(20000);

  let workflowController: PomeloWorkflowController;
  let mockWorkflowMapper: PomeloWorkflowMapper;
  let mockPomeloWorkflowService: PomeloWorkflowService;

  let app: TestingModule;

  beforeEach(async () => {
    mockWorkflowMapper = getMockPomeloWorkflowMapperWithDefaults();
    mockPomeloWorkflowService = getMockPomeloWorkflowServiceWithDefaults();

    const appConfigurations = {
      [SERVER_LOG_FILE_PATH]: `/tmp/test-${Math.floor(Math.random() * 1000000)}.log`,
    };
    // ***************** ENVIRONMENT VARIABLES CONFIGURATION *****************

    app = await Test.createTestingModule({
      imports: [TestConfigModule.registerAsync(appConfigurations), getTestWinstonModule()],
      providers: [
        {
          provide: PomeloWorkflowMapper,
          useFactory: () => instance(mockWorkflowMapper),
        },
        {
          provide: PomeloWorkflowService,
          useFactory: () => instance(mockPomeloWorkflowService),
        },
        PomeloWorkflowController,
      ],
    }).compile();

    workflowController = app.get<PomeloWorkflowController>(PomeloWorkflowController);
  });

  afterEach(async () => {
    app.close();
  });

  describe("getPomeloTransasction", () => {
    const POMELO_CARD_ID = "POMELO_CARD_ID";
    const POMELO_USER_ID = "POMELO_USER_ID";
    const NOBA_TRANSACTION_ID = "NOBA_TRANSACTION_ID";
    const pomeloTransaction: PomeloTransaction = getRandomPomeloTransaction(
      POMELO_CARD_ID,
      POMELO_USER_ID,
      NOBA_TRANSACTION_ID,
    );

    it("should throw NotFoundException if the pomeloTransaction is not found", async () => {
      const pomeloTransactionID = uuid();
      when(mockPomeloWorkflowService.getPomeloTransactionByPomeloTransactionID(pomeloTransactionID)).thenResolve(null);

      try {
        await workflowController.getPomeloTransasction(pomeloTransactionID);
        expect(true).toBe(false);
      } catch (err) {
        expect(err).toBeInstanceOf(NotFoundException);
        expect(err.message).toEqual(expect.stringContaining(pomeloTransactionID));
      }
    });

    it("should forward the pomeloTransaction as is to workflowMapper and returns the output", async () => {
      const mappedResponse: PomeloTransactionDTO = JSON.parse(JSON.stringify(pomeloTransaction));

      when(
        mockPomeloWorkflowService.getPomeloTransactionByPomeloTransactionID(pomeloTransaction.pomeloTransactionID),
      ).thenResolve(pomeloTransaction);
      when(mockWorkflowMapper.mapToPomeloTransactionDTO(anything())).thenReturn(mappedResponse);

      const response: PomeloTransactionDTO = await workflowController.getPomeloTransasction(
        pomeloTransaction.pomeloTransactionID,
      );

      expect(response).toStrictEqual(mappedResponse);
      const [propagatedObjectToMapperService] = capture(mockWorkflowMapper.mapToPomeloTransactionDTO).last();
      expect(propagatedObjectToMapperService).toStrictEqual(pomeloTransaction);
    });
  });

  describe("getPomeloUserTransasctions", () => {
    const POMELO_CARD_ID = "POMELO_CARD_ID";
    const POMELO_USER_ID = "POMELO_USER_ID";
    const NOBA_TRANSACTION_ID = "NOBA_TRANSACTION_ID";
    const pomeloTransaction1: PomeloTransaction = getRandomPomeloTransaction(
      POMELO_CARD_ID,
      POMELO_USER_ID,
      NOBA_TRANSACTION_ID,
    );
    const pomeloTransaction2: PomeloTransaction = getRandomPomeloTransaction(
      POMELO_CARD_ID,
      POMELO_USER_ID,
      NOBA_TRANSACTION_ID,
    );
    const pomeloTransaction3: PomeloTransaction = getRandomPomeloTransaction(
      POMELO_CARD_ID,
      POMELO_USER_ID,
      NOBA_TRANSACTION_ID,
    );

    it("should forward 'each' of the pomeloTransaction as is to workflowMapper and returns the output", async () => {
      const mappedTransaction1: PomeloTransactionDTO = JSON.parse(JSON.stringify(pomeloTransaction1));
      const mappedTransaction2: PomeloTransactionDTO = JSON.parse(JSON.stringify(pomeloTransaction2));
      const mappedTransaction3: PomeloTransactionDTO = JSON.parse(JSON.stringify(pomeloTransaction3));

      when(
        mockPomeloWorkflowService.getPomeloUserTransactionsForSettlementDate(POMELO_USER_ID, "2023-05-23"),
      ).thenResolve([pomeloTransaction1, pomeloTransaction2, pomeloTransaction3]);
      when(mockWorkflowMapper.mapToPomeloTransactionDTO(deepEqual(pomeloTransaction1))).thenReturn(mappedTransaction1);
      when(mockWorkflowMapper.mapToPomeloTransactionDTO(deepEqual(pomeloTransaction2))).thenReturn(mappedTransaction2);
      when(mockWorkflowMapper.mapToPomeloTransactionDTO(deepEqual(pomeloTransaction3))).thenReturn(mappedTransaction3);

      const response: PomeloTransactionsDTO = await workflowController.getPomeloUserTransasctions(
        POMELO_USER_ID,
        "2023-05-23",
      );

      expect(response).toStrictEqual({
        transactions: [mappedTransaction1, mappedTransaction2, mappedTransaction3],
      });
    });
  });
});
