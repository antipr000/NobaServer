import { Test, TestingModule } from "@nestjs/testing";
import { SERVER_LOG_FILE_PATH } from "../../../config/ConfigurationUtils";
import { TestConfigModule } from "../../../core/utils/AppConfigModule";
import { getTestWinstonModule } from "../../../core/utils/WinstonModule";
import { uuid } from "uuidv4";
import { Transaction, TransactionStatus, WorkflowName } from "../domain/Transaction";
import { anyString, anything, capture, instance, when } from "ts-mockito";
import { TransactionService } from "../transaction.service";
import { getMockTransactionServiceWithDefaults } from "../mocks/mock.transaction.service";
import { UpdateTransactionRequestDTO, UpdateTransactionDTO } from "../dto/TransactionDTO";
import { TransactionWorkflowController } from "../transaction.workflow.controller";
import { BadRequestException } from "@nestjs/common";
import { TransactionWorkflowMapper } from "../mapper/transaction.workflow.mapper";
import { getMockTransactionWorkflowMapperWithDefaults } from "../mocks/mock.transaction.workflow.mapper";
import { DebitBankRequestDTO } from "../dto/transaction.workflow.controller.dto";
import { FeeType } from "../domain/TransactionFee";

const getRandomTransaction = (consumerID: string): Transaction => {
  const transaction: Transaction = {
    transactionRef: uuid(),
    exchangeRate: 1,
    status: TransactionStatus.INITIATED,
    workflowName: WorkflowName.WALLET_DEPOSIT,
    id: uuid(),
    sessionKey: uuid(),
    memo: "New transaction",
    createdTimestamp: new Date(),
    updatedTimestamp: new Date(),
    debitAmount: 100,
    debitCurrency: "USD",
    debitConsumerID: consumerID,
    transactionFees: [
      {
        amount: 10,
        currency: "USD",
        type: FeeType.NOBA,
        id: uuid(),
        timestamp: new Date(),
      },
    ],
  };
  return transaction;
};

describe("Transaction Workflow Controller tests", () => {
  jest.setTimeout(20000);

  let app: TestingModule;
  let mockTransactionService: TransactionService;
  let transactionWorkflowController: TransactionWorkflowController;
  let transactionWorkflowMapper: TransactionWorkflowMapper;

  beforeEach(async () => {
    mockTransactionService = getMockTransactionServiceWithDefaults();
    transactionWorkflowMapper = getMockTransactionWorkflowMapperWithDefaults();

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
        {
          provide: TransactionWorkflowMapper,
          useFactory: () => instance(transactionWorkflowMapper),
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
        status: TransactionStatus.COMPLETED,
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

      const updateTransactionDTO: UpdateTransactionRequestDTO = {
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

      const updateTransactionDTO: UpdateTransactionRequestDTO = {
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

  describe("debitfrombank", () => {
    it("should debit from bank", async () => {
      const consumerID = "testConsumerID";
      const transaction: Transaction = getRandomTransaction(consumerID);
      const debitRequestDTO: DebitBankRequestDTO = {
        transactionID: transaction.id,
      };

      when(mockTransactionService.debitFromBank(transaction.id)).thenResolve({
        state: "Completed",
        withdrawalID: "test-withdrawal-id",
      });

      const response = await transactionWorkflowController.debitFromBank(debitRequestDTO);
      expect(response.withdrawalID).toBe("test-withdrawal-id");
    });
  });

  describe("getTransactionByTransactionID", () => {
    it("should take the Transaction from service and forwards it to mappers", async () => {
      const transaction: Transaction = getRandomTransaction("testConsumerID");

      when(mockTransactionService.getTransactionByTransactionID(anyString())).thenResolve(transaction);
      when(transactionWorkflowMapper.toWorkflowTransactionDTO(anything(), anything())).thenReturn(null);
      when(mockTransactionService.getTransactionEvents(anyString(), anything())).thenResolve([]);

      await transactionWorkflowController.getTransactionByTransactionID(transaction.id);

      const [propagatedTransactionIdToGetTransaction] = capture(
        mockTransactionService.getTransactionByTransactionID,
      ).last();
      const [propagatedTransactionIdToGetTransactionEvents] = capture(
        mockTransactionService.getTransactionEvents,
      ).last();
      const [propagatedMonoTransaction] = capture(transactionWorkflowMapper.toWorkflowTransactionDTO).last();
      expect(propagatedTransactionIdToGetTransaction).toEqual(transaction.id);
      expect(propagatedTransactionIdToGetTransactionEvents).toEqual(transaction.id);
      expect(propagatedMonoTransaction).toEqual(transaction);
    });
  });
});
