import { Test, TestingModule } from "@nestjs/testing";
import { SERVER_LOG_FILE_PATH } from "../../../../config/ConfigurationUtils";
import { TestConfigModule } from "../../../../core/utils/AppConfigModule";
import { getTestWinstonModule } from "../../../../core/utils/WinstonModule";
import { MonoWorkflowControllerMappers } from "../mono.workflow.controller.mappers";
import { MonoTransaction, MonoTransactionState } from "../../domain/Mono";
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

  describe("getMonoTransaction", () => {
    it("should take the MonoTransaction from service and forwards it to mappers", async () => {
      const monoTransaction: MonoTransaction = {
        collectionLinkID: "collectionLinkID",
        collectionURL: `https://mono.com/collections`,
        createdTimestamp: new Date(),
        updatedTimestamp: new Date(),
        nobaTransactionID: "nobaTransactionID",
        state: MonoTransactionState.PENDING,
        id: "ID",
        monoTransactionID: "monoTransactionID",
      };
      const monoTransactionDTO: MonoTransactionDTO = {
        id: monoTransaction.id,
        collectionLinkID: monoTransaction.collectionLinkID,
        nobaTransactionID: monoTransaction.nobaTransactionID,
        state: monoTransaction.state,
        monoTransactionID: monoTransaction.monoTransactionID,
        createdTimestamp: monoTransaction.createdTimestamp,
        updatedTimestamp: monoTransaction.updatedTimestamp,
      };

      when(monoService.getTransactionByCollectionLinkID(anyString())).thenResolve(monoTransaction);
      when(monoWorkflowControllerMappers.convertToMonoTransactionDTO(anything())).thenReturn(monoTransactionDTO);

      const response: MonoTransactionDTO = await monoWorkflowController.getMonoTransaction("collectionLinkID");

      const [propagatedCollectionLinkID] = capture(monoService.getTransactionByCollectionLinkID).last();
      const [propagatedMonoTransaction] = capture(monoWorkflowControllerMappers.convertToMonoTransactionDTO).last();
      expect(propagatedCollectionLinkID).toEqual("collectionLinkID");
      expect(propagatedMonoTransaction).toEqual(monoTransaction);
    });

    it("should throw NotFoundException if the Mono Transaction with specified collectionLinkID is not found", async () => {
      when(monoService.getTransactionByCollectionLinkID(anyString())).thenResolve(null);

      await expect(monoWorkflowController.getMonoTransaction("collectionLinkID")).rejects.toThrowError(
        NotFoundException,
      );
    });
  });
});
