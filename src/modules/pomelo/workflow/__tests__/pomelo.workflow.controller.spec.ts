import { Test, TestingModule } from "@nestjs/testing";
import { SERVER_LOG_FILE_PATH } from "../../../../config/ConfigurationUtils";
import { TestConfigModule } from "../../../../core/utils/AppConfigModule";
import { getTestWinstonModule } from "../../../../core/utils/WinstonModule";
import { anything, capture, instance, when } from "ts-mockito";
import { PomeloTransaction } from "../../domain/PomeloTransaction";
import { PomeloWorkflowController } from "../pomelo.workflow.controller";
import { PomeloWorkflowMapper } from "../pomelo.workflow.mapper";
import { PomeloWorkflowService } from "../pomelo.workflow.service";
import { getMockPomeloWorkflowMapperWithDefaults } from "../mocks/mock.pomelo.workflow.mapper";
import { getMockPomeloWorkflowServiceWithDefaults } from "../mocks/mock.pomelo.workflow.service";
import { getRandomPomeloTransaction } from "../../public/test_utils/util";
import { PomeloTransactionDTO } from "../../dto/pomelo.workflow.controller.dto";
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
});
