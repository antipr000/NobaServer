import { Test, TestingModule } from "@nestjs/testing";
import { SERVER_LOG_FILE_PATH } from "../../../config/ConfigurationUtils";
import { TestConfigModule } from "../../../core/utils/AppConfigModule";
import { getTestWinstonModule } from "../../../core/utils/WinstonModule";
import { uuid } from "uuidv4";
import { Transaction, TransactionStatus, WorkflowName } from "../domain/Transaction";
import { instance, when } from "ts-mockito";
import { TransactionService } from "../transaction.service";
import { TransactionController } from "../transaction.controller";
import { getMockTransactionServiceWithDefaults } from "../mocks/mock.transaction.service";
import { Consumer, ConsumerProps } from "../../../modules/consumer/domain/Consumer";
import { TransactionDTO } from "../dto/TransactionDTO";
import { Utils } from "../../../core/utils/Utils";

const getRandomTransaction = (consumerID: string, isCreditTransaction: boolean = false): Transaction => {
  const transaction: Transaction = {
    transactionRef: uuid(),
    consumerID: consumerID,
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
  } else {
    transaction.debitAmount = 100;
    transaction.debitCurrency = "USD";
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

describe("PostgresTransactionRepoTests", () => {
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
    app.close();
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
  });
});
