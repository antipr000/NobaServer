import { Test, TestingModule } from "@nestjs/testing";
import { SERVER_LOG_FILE_PATH } from "../../../config/ConfigurationUtils";
import { TestConfigModule } from "../../../core/utils/AppConfigModule";
import { getTestWinstonModule } from "../../../core/utils/WinstonModule";
import { uuid } from "uuidv4";
import { Transaction, TransactionStatus, WorkflowName } from "../domain/Transaction";
import { deepEqual, instance, when } from "ts-mockito";
import { TransactionService } from "../transaction.service";
import { TransactionController } from "../transaction.controller";
import { getMockTransactionServiceWithDefaults } from "../mocks/mock.transaction.service";
import { Consumer, ConsumerProps } from "../../../modules/consumer/domain/Consumer";
import { TransactionDTO } from "../dto/TransactionDTO";
import { Utils } from "../../../core/utils/Utils";
import { TransactionFilterOptionsDTO } from "../dto/TransactionFilterOptionsDTO";
import { NotFoundException } from "@nestjs/common";
import { Currency } from "../domain/TransactionTypes";

const getRandomTransaction = (consumerID: string, isCreditTransaction = false): Transaction => {
  const transaction: Transaction = {
    transactionRef: uuid(),
    exchangeRate: 1,
    status: TransactionStatus.PENDING,
    workflowName: WorkflowName.BANK_TO_NOBA_WALLET,
    id: uuid(),
    createdTimestamp: new Date(),
    updatedTimestamp: new Date(),
  };

  if (isCreditTransaction) {
    transaction.creditAmount = 100;
    transaction.creditCurrency = "USD";
    transaction.creditConsumerID = consumerID;
  } else {
    transaction.debitAmount = 100;
    transaction.debitCurrency = "USD";
    transaction.debitConsumerID = consumerID;
  }
  return transaction;
};

const getRandomConsumer = (consumerID: string): Consumer => {
  const email = `${uuid()}_${new Date().valueOf()}@noba.com`;
  const props: Partial<ConsumerProps> = {
    id: consumerID,
    firstName: "Noba",
    lastName: "lastName",
    email: email,
    displayEmail: email.toUpperCase(),
    referralCode: Utils.getAlphaNanoID(15),
    phone: `+1${Math.floor(Math.random() * 1000000000)}`,
  };
  return Consumer.createConsumer(props);
};

describe("Transaction Controller tests", () => {
  jest.setTimeout(20000);

  let app: TestingModule;
  let transactionService: TransactionService;
  let transactionController: TransactionController;

  beforeEach(async () => {
    transactionService = getMockTransactionServiceWithDefaults();

    const appConfigurations = {
      [SERVER_LOG_FILE_PATH]: `/tmp/test-${Math.floor(Math.random() * 1000000)}.log`,
    };
    // ***************** ENVIRONMENT VARIABLES CONFIGURATION *****************

    app = await Test.createTestingModule({
      imports: [TestConfigModule.registerAsync(appConfigurations), getTestWinstonModule()],
      providers: [
        {
          provide: TransactionService,
          useFactory: () => instance(transactionService),
        },
        TransactionController,
      ],
    }).compile();

    transactionController = app.get<TransactionController>(TransactionController);
  });

  afterAll(async () => {
    await app.close();
  });

  describe("getTransaction", () => {
    it("should return the transaction", async () => {
      const consumerID = "testConsumerID";
      const transactionRef = "transactionRef";
      const transaction: Transaction = getRandomTransaction(consumerID);
      when(transactionService.getTransactionByTransactionRef(transactionRef, consumerID)).thenResolve(transaction);

      const result: TransactionDTO = await transactionController.getTransaction(
        transactionRef,
        getRandomConsumer(consumerID),
      );
      const expectedResult: TransactionDTO = {
        transactionRef: transaction.transactionRef,
        workflowName: transaction.workflowName,
        debitCurrency: transaction.debitCurrency,
        creditCurrency: transaction.creditCurrency,
        debitAmount: transaction.debitAmount,
        creditAmount: transaction.creditAmount,
        exchangeRate: transaction.exchangeRate.toString(),
        memo: "",
      };

      expect(result).toStrictEqual(expectedResult);
    });

    it("should throw NotFoundException when transaction is not found", async () => {
      const consumerID = "testConsumerID";
      const transactionRef = "transactionRef";
      when(transactionService.getTransactionByTransactionRef(transactionRef, consumerID)).thenResolve(null);

      expect(
        async () => await transactionController.getTransaction(transactionRef, getRandomConsumer(consumerID)),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe("getAllTransactions", () => {
    it("should get filtered transactions", async () => {
      const consumerID = "testConsumerID";
      const transactionRef = "transactionRef";
      const transaction: Transaction = getRandomTransaction(consumerID);
      transaction.transactionRef = transactionRef;
      transaction.status = TransactionStatus.SUCCESS;

      const filter: TransactionFilterOptionsDTO = {
        consumerID: consumerID,
        transactionStatus: TransactionStatus.SUCCESS,
      };
      when(transactionService.getFilteredTransactions(deepEqual(filter))).thenResolve([transaction]);

      const allTransactions = await transactionController.getAllTransactions(
        {
          transactionStatus: TransactionStatus.SUCCESS,
        },
        getRandomConsumer(consumerID),
      );

      expect(allTransactions.length).toBe(1);
      expect(allTransactions[0].transactionRef).toBe(transactionRef);
    });
  });

  describe("initiateTransaction", () => {
    it("should return transaction id of the initiated transaction if all parameters are correct", async () => {
      const orderDetails = {
        debitConsumerIDOrTag: "$soham",
        workflowName: WorkflowName.BANK_TO_NOBA_WALLET,
        debitCurrency: Currency.COP,
        debitAmount: 100,
      };

      const consumerID = "fakeConsumerID";
      const consumer = getRandomConsumer(consumerID);

      when(
        transactionService.initiateTransaction(deepEqual(orderDetails), deepEqual(consumer), "fake-session"),
      ).thenResolve("fake-transaction-id");

      const response = await transactionController.initiateTransaction("fake-session", orderDetails, consumer);

      expect(response).toBe("fake-transaction-id");
    });
  });
});
