import { Test, TestingModule } from "@nestjs/testing";
import { SERVER_LOG_FILE_PATH } from "../../../../config/ConfigurationUtils";
import { TestConfigModule } from "../../../../core/utils/AppConfigModule";
import { getTestWinstonModule } from "../../../../core/utils/WinstonModule";
import { MonoWorkflowControllerMappers } from "../mono.workflow.controller.mappers";
import { MonoTransaction, MonoTransactionState, MonoTransactionType } from "../../domain/Mono";
import { MonoTransactionDTO } from "../../dto/mono.workflow.controller.dto";
import { MonoWorkflowController } from "../mono.workflow.controller";
import { anyString, anything, capture, instance, when } from "ts-mockito";
import { MonoService } from "../mono.service";
import { getMockMonoServiceWithDefaults } from "../mocks/mock.mono.service";
import { getMockMonoWorkflowControllerMappersWithDefaults } from "../mocks/mock.mono.workflow.controller.mappers";
import { NotFoundException } from "@nestjs/common";

describe("MonoWorkflowControllerTests", () => {
  jest.setTimeout(20000);

  let monoWorkflowController: MonoWorkflowController;
  let monoService: MonoService;
  let monoWorkflowControllerMappers: MonoWorkflowControllerMappers;
  let app: TestingModule;

  beforeEach(async () => {
    monoService = getMockMonoServiceWithDefaults();
    monoWorkflowControllerMappers = getMockMonoWorkflowControllerMappersWithDefaults();

    const appConfigurations = {
      [SERVER_LOG_FILE_PATH]: `/tmp/test-${Math.floor(Math.random() * 1000000)}.log`,
    };
    // ***************** ENVIRONMENT VARIABLES CONFIGURATION *****************

    app = await Test.createTestingModule({
      imports: [TestConfigModule.registerAsync(appConfigurations), getTestWinstonModule()],
      providers: [
        {
          provide: MonoWorkflowControllerMappers,
          useFactory: () => instance(monoWorkflowControllerMappers),
        },
        {
          provide: MonoService,
          useFactory: () => instance(monoService),
        },
        MonoWorkflowController,
      ],
    }).compile();

    monoWorkflowController = app.get<MonoWorkflowController>(MonoWorkflowController);
  });

  afterEach(async () => {
    app.close();
  });

  describe("processWebhookRequests", () => {
    it("should forward the request & headers to the service as is", async () => {
      when(monoService.processWebhookEvent(anything(), anyString())).thenResolve();

      const requestBody = { some: "requestBody" };
      const monoSignature = "monoSignature";

      await monoWorkflowController.processWebhookRequests(requestBody, monoSignature);

      const [propagatedRequestBody, propagatedMonoSignature] = capture(monoService.processWebhookEvent).last();
      expect(propagatedRequestBody).toEqual(requestBody);
      expect(propagatedMonoSignature).toEqual(monoSignature);
    });
  });

  describe("getMonoTransactionByNobaTransactionID", () => {
    it("should take the MonoTransaction from service and forwards it to mappers", async () => {
      const monoTransaction: MonoTransaction = {
        id: "ID",
        nobaTransactionID: "nobaTransactionID",
        type: MonoTransactionType.COLLECTION_LINK_DEPOSIT,
        state: MonoTransactionState.SUCCESS,
        createdTimestamp: new Date(),
        updatedTimestamp: new Date(),
        collectionLinkDepositDetails: {
          collectionLinkID: "collectionLinkID",
          collectionURL: `https://mono.com/collections`,
          monoPaymentTransactionID: "monoPaymentTransactionID",
        },
      };
      const monoTransactionDTO: MonoTransactionDTO = {
        id: "ID",
        nobaTransactionID: "nobaTransactionID",
        state: "SUCCESS" as MonoTransactionState,
        type: "COLLECTION_LINK_DEPOSIT" as MonoTransactionType,
        collectionLinkDepositDetails: {
          collectionLinkID: "collectionLinkID",
          monoPaymentTransactionID: "monoPaymentTransactionID",
        },
        createdTimestamp: monoTransaction.createdTimestamp,
        updatedTimestamp: monoTransaction.updatedTimestamp,
      };

      when(monoService.getTransactionByNobaTransactionID(anyString())).thenResolve(monoTransaction);
      when(monoWorkflowControllerMappers.convertToMonoTransactionDTO(anything())).thenReturn(monoTransactionDTO);

      const response: MonoTransactionDTO = await monoWorkflowController.getMonoTransactionByNobaTransactionID(
        "nobaTransactionID",
      );

      const [propagatedCollectionLinkID] = capture(monoService.getTransactionByNobaTransactionID).last();
      const [propagatedMonoTransaction] = capture(monoWorkflowControllerMappers.convertToMonoTransactionDTO).last();
      expect(propagatedCollectionLinkID).toEqual("nobaTransactionID");
      expect(propagatedMonoTransaction).toEqual(monoTransaction);
    });

    it("should throw NotFoundException if the Mono Transaction with specified nobaTransactionID is not found", async () => {
      when(monoService.getTransactionByNobaTransactionID(anyString())).thenResolve(null);

      await expect(
        monoWorkflowController.getMonoTransactionByNobaTransactionID("nobaTransactionID"),
      ).rejects.toThrowError(NotFoundException);
    });
  });
});
