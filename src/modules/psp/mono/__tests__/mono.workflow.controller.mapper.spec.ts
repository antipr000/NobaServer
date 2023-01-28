import { Test, TestingModule } from "@nestjs/testing";
import { SERVER_LOG_FILE_PATH } from "../../../../config/ConfigurationUtils";
import { TestConfigModule } from "../../../../core/utils/AppConfigModule";
import { getTestWinstonModule } from "../../../../core/utils/WinstonModule";
import { MonoWorkflowControllerMappers } from "../mono.workflow.controller.mappers";
import { MonoTransaction, MonoTransactionState, MonoTransactionType } from "../../domain/Mono";
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
    it("should map all the fields correctly for COLLECTION_LINK_DEPOSIT transactions", () => {
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

      const monoTransactionDTO: MonoTransactionDTO =
        monoWorkflowControllerMappers.convertToMonoTransactionDTO(monoTransaction);

      expect(monoTransactionDTO).toEqual({
        id: "ID",
        nobaTransactionID: "nobaTransactionID",
        state: "SUCCESS",
        type: "COLLECTION_LINK_DEPOSIT",
        collectionLinkDepositDetails: {
          collectionLinkID: "collectionLinkID",
          monoPaymentTransactionID: "monoPaymentTransactionID",
        },
        createdTimestamp: monoTransaction.createdTimestamp,
        updatedTimestamp: monoTransaction.updatedTimestamp,
      });
    });

    it("should map all the fields correctly for WITHDRAWAL transanctions", () => {
      const monoTransaction: MonoTransaction = {
        id: "ID",
        nobaTransactionID: "nobaTransactionID",
        type: MonoTransactionType.WITHDRAWAL,
        state: MonoTransactionState.SUCCESS,
        createdTimestamp: new Date(),
        updatedTimestamp: new Date(),
        withdrawalDetails: {
          transferID: "transferID",
          batchID: "batchID",
          declinationReason: "declinationReason",
        },
      };

      const monoTransactionDTO: MonoTransactionDTO =
        monoWorkflowControllerMappers.convertToMonoTransactionDTO(monoTransaction);

      expect(monoTransactionDTO).toEqual({
        id: "ID",
        nobaTransactionID: "nobaTransactionID",
        state: "SUCCESS",
        type: "WITHDRAWAL",
        withdrawalDetails: {
          transferID: "transferID",
          batchID: "batchID",
          declinationReason: "declinationReason",
        },
        createdTimestamp: monoTransaction.createdTimestamp,
        updatedTimestamp: monoTransaction.updatedTimestamp,
      });
    });
  });
});
