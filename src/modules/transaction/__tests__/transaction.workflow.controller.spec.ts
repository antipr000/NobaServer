import { Test, TestingModule } from "@nestjs/testing";
import { SERVER_LOG_FILE_PATH } from "../../../config/ConfigurationUtils";
import { TestConfigModule } from "../../../core/utils/AppConfigModule";
import { getTestWinstonModule } from "../../../core/utils/WinstonModule";
import { uuid } from "uuidv4";
import { Transaction, TransactionStatus, WorkflowName } from "../domain/Transaction";
import { instance, when } from "ts-mockito";
import { TransactionService } from "../transaction.service";
import { getMockTransactionServiceWithDefaults } from "../mocks/mock.transaction.service";
import { TransactionDTO, UpdateTransactionDTO } from "../dto/TransactionDTO";
import { TransactionWorkflowController } from "../transaction.workflow.controller";
import { BadRequestException } from "@nestjs/common";

const getRandomTransaction = (consumerID: string): Transaction => {
  const transaction: Transaction = {
    transactionRef: uuid(),
    exchangeRate: 1,
    status: TransactionStatus.PENDING,
    workflowName: WorkflowName.CREDIT_CONSUMER_WALLET,
    id: uuid(),
    sessionKey: uuid(),
    memo: "New transaction",
    createdTimestamp: new Date(),
    updatedTimestamp: new Date(),
    debitAmount: 100,
    debitCurrency: "USD",
    debitConsumerID: consumerID,
  };
  return transaction;
};

describe("Transaction Workflow Controller tests", () => {
  jest.setTimeout(20000);

  let app: TestingModule;
  let mockTransactionService: TransactionService;
  let transactionWorkflowController: TransactionWorkflowController;

  beforeEach(async () => {
    mockTransactionService = getMockTransactionServiceWithDefaults();

    const appConfigurations = {
      [SERVER_LOG_FILE_PATH]: `/tmp/test-${Math.floor(Math.random() * 1000000)}.log`,
    };
    // ***************** ENVIRONMENT VARIABLES CONFIGURATION *****************

    app = await Test.createTestingModule({
      imports: [TestConfigModule.registerAsync(appConfigurations), getTestWinstonModule()],
      providers: [
        {
          provide: TransactionService,
          useFactory: () => instance(mockTransactionService),
        },
        TransactionWorkflowController,
      ],
    }).compile();

    transactionWorkflowController = app.get<TransactionWorkflowController>(TransactionWorkflowController);
  });

  afterAll(async () => {
    await app.close();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe("patchTransaction", () => {
    it("should update an existing transaction status", async () => {
      const consumerID = "testConsumerID";
      const transaction: Transaction = getRandomTransaction(consumerID);

      const updateTransactionDTO: UpdateTransactionDTO = {
        status: TransactionStatus.SUCCESS,
      };

      const updateSpy = jest.spyOn(mockTransactionService, "updateTransaction");
      when(mockTransactionService.updateTransaction(transaction.id, updateTransactionDTO)).thenResolve({
        ...transaction,
        status: updateTransactionDTO.status,
      });

      await transactionWorkflowController.patchTransaction(updateTransactionDTO, transaction.id);

      expect(updateSpy).toBeCalledTimes(1);
    });

    it("should add an event to an existing transaction", async () => {
      const consumerID = "testConsumerID";
      const transaction: Transaction = getRandomTransaction(consumerID);

      const updateTransactionDTO: UpdateTransactionDTO = {
        transactionEvent: {
          message: "test event message",
        },
      };

      const addEventSpy = jest.spyOn(mockTransactionService, "addTransactionEvent");
      when(
        mockTransactionService.addTransactionEvent(transaction.id, updateTransactionDTO.transactionEvent),
      ).thenResolve();

      await transactionWorkflowController.patchTransaction(updateTransactionDTO, transaction.id);

      expect(addEventSpy).toBeCalledTimes(1);
    });

    it("should update status and add an event to an existing transaction", async () => {
      const consumerID = "testConsumerID";
      const transaction: Transaction = getRandomTransaction(consumerID);

      const updateTransactionDTO: UpdateTransactionDTO = {
        transactionEvent: {
          message: "test event message",
        },
      };

      const addEventSpy = jest.spyOn(mockTransactionService, "addTransactionEvent");
      when(
        mockTransactionService.addTransactionEvent(transaction.id, updateTransactionDTO.transactionEvent),
      ).thenResolve();

      const updateSpy = jest.spyOn(mockTransactionService, "updateTransaction");
      when(mockTransactionService.updateTransaction(transaction.id, updateTransactionDTO)).thenResolve({
        ...transaction,
        status: updateTransactionDTO.status,
      });

      await transactionWorkflowController.patchTransaction(updateTransactionDTO, transaction.id);

      expect(addEventSpy).toBeCalledTimes(1);
      expect(updateSpy).toBeCalledTimes(1);
    });
  });

  it("should throw a BadRequestException if there's nothing to update", async () => {
    const addEventSpy = jest.spyOn(mockTransactionService, "addTransactionEvent");
    const updateSpy = jest.spyOn(mockTransactionService, "updateTransaction");

    expect(async () => await transactionWorkflowController.patchTransaction({}, "test-id")).rejects.toThrowError(
      BadRequestException,
    );

    expect(addEventSpy).toBeCalledTimes(0);
    expect(updateSpy).toBeCalledTimes(0);
  });
});
