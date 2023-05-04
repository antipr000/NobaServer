import { Test, TestingModule } from "@nestjs/testing";
import { NotFoundError } from "../../../core/exception/CommonAppException";
import { SERVER_LOG_FILE_PATH } from "../../../config/ConfigurationUtils";
import { TestConfigModule } from "../../../core/utils/AppConfigModule";
import { getTestWinstonModule } from "../../../core/utils/WinstonModule";
import { TransactionWorkflowMapper } from "../mapper/transaction.workflow.mapper";
import { Transaction, TransactionStatus, WorkflowName } from "../domain/Transaction";
import { WorkflowTransactionDTO } from "../dto/transaction.workflow.controller.dto";
import { FeeType } from "../domain/TransactionFee";
import { TransactionEvent } from "../domain/TransactionEvent";

describe("TransactionWorkflowMapperTest", () => {
  jest.setTimeout(20000);

  let transactionWorkflowMapper: TransactionWorkflowMapper;
  let app: TestingModule;

  beforeEach(async () => {
    const appConfigurations = {
      [SERVER_LOG_FILE_PATH]: `/tmp/test-${Math.floor(Math.random() * 1000000)}.log`,
    };
    // ***************** ENVIRONMENT VARIABLES CONFIGURATION *****************

    app = await Test.createTestingModule({
      imports: [TestConfigModule.registerAsync(appConfigurations), getTestWinstonModule()],
      providers: [TransactionWorkflowMapper],
    }).compile();

    transactionWorkflowMapper = app.get<TransactionWorkflowMapper>(TransactionWorkflowMapper);
  });

  afterEach(async () => {
    app.close();
  });

  describe("toWorkflowTransactionDTO", () => {
    it("should map all the fields correctly", () => {
      const transaction: Transaction = {
        exchangeRate: 1.2,
        status: TransactionStatus.INITIATED,
        workflowName: WorkflowName.WALLET_TRANSFER,
        id: "ID",
        sessionKey: "sessionKey",
        memo: "memo",
        createdTimestamp: new Date(),
        updatedTimestamp: new Date(),
        debitAmount: 100,
        debitCurrency: "INR",
        debitConsumerID: "debitConsumerID",
        creditAmount: 200,
        creditCurrency: "USD",
        creditConsumerID: "creditConsumerID",
        transactionRef: "transactionRef",
        transactionFees: [
          {
            amount: 10,
            currency: "USD",
            type: FeeType.NOBA,
            id: "id",
            timestamp: new Date(),
          },
        ],
      };
      const transactionEvents: TransactionEvent[] = [
        {
          id: "ID_1",
          message: "INTERNAL_MESSAGE_WITH_DETAILS_KEY_AND_PARAMS",
          timestamp: new Date(),
          transactionID: "ID",
          details: "DETAILS",
          internal: true,
          key: "KEY",
          param1: "PARAM1",
          param2: "PARAM2",
          param3: "PARAM3",
          param4: "PARAM4",
          param5: "PARAM5",
        },
      ];

      const workflowTransactionDTO: WorkflowTransactionDTO = transactionWorkflowMapper.toWorkflowTransactionDTO(
        transaction,
        transactionEvents,
      );

      expect(workflowTransactionDTO).toEqual({
        id: "ID",
        transactionRef: "transactionRef",
        workflowName: WorkflowName.WALLET_TRANSFER,
        debitConsumerID: "debitConsumerID",
        creditConsumerID: "creditConsumerID",
        debitCurrency: "INR",
        creditCurrency: "USD",
        debitAmount: 100,
        creditAmount: 200,
        exchangeRate: "1.2",
        status: TransactionStatus.INITIATED,
        memo: "memo",
        transactionEvents: [
          {
            timestamp: transactionEvents[0].timestamp,
            message: "INTERNAL_MESSAGE_WITH_DETAILS_KEY_AND_PARAMS",
            internal: true,
            details: "DETAILS",
            text: "INTERNAL_MESSAGE_WITH_DETAILS_KEY_AND_PARAMS",
          },
        ],
        totalFees: 10,
        transactionFees: [
          {
            amount: 10,
            currency: "USD",
            type: FeeType.NOBA,
          },
        ],
      });
    });

    it("should throw 'NotFoundError' if the input transaction is 'null'", () => {
      expect(() => transactionWorkflowMapper.toWorkflowTransactionDTO(null, [])).toThrowError(NotFoundError);
    });

    it("should throw 'NotFoundError' if the input transaction is 'undefined'", () => {
      expect(() => transactionWorkflowMapper.toWorkflowTransactionDTO(undefined, [])).toThrowError(NotFoundError);
    });
  });
});
