import { Test, TestingModule } from "@nestjs/testing";
import { SERVER_LOG_FILE_PATH } from "../../../../config/ConfigurationUtils";
import { TestConfigModule } from "../../../../core/utils/AppConfigModule";
import { getTestWinstonModule } from "../../../../core/utils/WinstonModule";
import { MonoWorkflowControllerMappers } from "../mono.workflow.controller.mappers";
import { MonoTransaction, MonoTransactionState } from "../../domain/Mono";
import { MonoTransactionDTO } from "../../dto/mono.workflow.controller.dto";

describe("MonoWorkflowControllerMappersTest", () => {
  jest.setTimeout(20000);

  let monoWorkflowControllerMappers: MonoWorkflowControllerMappers;
  let app: TestingModule;

  beforeEach(async () => {
    const appConfigurations = {
      [SERVER_LOG_FILE_PATH]: `/tmp/test-${Math.floor(Math.random() * 1000000)}.log`,
    };
    // ***************** ENVIRONMENT VARIABLES CONFIGURATION *****************

    app = await Test.createTestingModule({
      imports: [TestConfigModule.registerAsync(appConfigurations), getTestWinstonModule()],
      providers: [MonoWorkflowControllerMappers],
    }).compile();

    monoWorkflowControllerMappers = app.get<MonoWorkflowControllerMappers>(MonoWorkflowControllerMappers);
  });

  afterEach(async () => {
    app.close();
  });

  describe("convertToMonoTransactionDTO", () => {
    it("should map all the fields correctly", () => {
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

      const monoTransactionDTO: MonoTransactionDTO =
        monoWorkflowControllerMappers.convertToMonoTransactionDTO(monoTransaction);

      expect(monoTransactionDTO).toEqual({
        id: "ID",
        collectionLinkID: "collectionLinkID",
        nobaTransactionID: "nobaTransactionID",
        state: "PENDING",
        monoTransactionID: "monoTransactionID",
        createdTimestamp: monoTransaction.createdTimestamp,
        updatedTimestamp: monoTransaction.updatedTimestamp,
      });
    });
  });
});
