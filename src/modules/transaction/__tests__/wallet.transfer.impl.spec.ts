import { Test, TestingModule } from "@nestjs/testing";
import { SERVER_LOG_FILE_PATH } from "../../../config/ConfigurationUtils";
import { TestConfigModule } from "../../../core/utils/AppConfigModule";
import { getTestWinstonModule } from "../../../core/utils/WinstonModule";
import { v4 } from "uuid";
import { Transaction, TransactionStatus, WorkflowName } from "../domain/Transaction";
import { anyNumber, anyString, instance, verify, when } from "ts-mockito";
import { InitiateTransactionDTO } from "../dto/CreateTransactionDTO";
import { Currency } from "../domain/TransactionTypes";
import { WorkflowExecutor } from "../../../infra/temporal/workflow.executor";
import { getMockWorkflowExecutorWithDefaults } from "../../../infra/temporal/mocks/mock.workflow.executor";
import { Consumer, ConsumerProps } from "../../../modules/consumer/domain/Consumer";
import { Utils } from "../../../core/utils/Utils";
import { ServiceException } from "../../../core/exception/service.exception";
import { WalletTransferImpl } from "../factory/wallet.transfer.impl";
import { ProcessedTransactionDTO } from "../dto/ProcessedTransactionDTO";

describe("WalletTransferImpl Tests", () => {
  jest.setTimeout(20000);

  let app: TestingModule;
  let workflowExecutor: WorkflowExecutor;
  let walletTransferImpl: WalletTransferImpl;

  beforeAll(async () => {
    workflowExecutor = getMockWorkflowExecutorWithDefaults();

    const appConfigurations = {
      [SERVER_LOG_FILE_PATH]: `/tmp/test-${Math.floor(Math.random() * 1000000)}.log`,
    };
    // ***************** ENVIRONMENT VARIABLES CONFIGURATION *****************

    app = await Test.createTestingModule({
      imports: [TestConfigModule.registerAsync(appConfigurations), getTestWinstonModule()],
      providers: [
        {
          provide: WorkflowExecutor,
          useFactory: () => instance(workflowExecutor),
        },
        WalletTransferImpl,
      ],
    }).compile();

    walletTransferImpl = app.get<WalletTransferImpl>(WalletTransferImpl);
  });

  afterAll(async () => {
    await app.close();
  });

  afterEach(() => {
    // jest.resetAllMocks();
  });

  describe("preprocessTransactionParams", () => {
    it("should preprocess a WALLET_TRANSFER transaction", async () => {
      const consumer = getRandomConsumer("consumerID");
      const { transactionDTO, inputTransaction, transaction } = getRandomTransaction(
        consumer.props.id,
        "fake-consumer-2",
      );

      jest.spyOn(Utils, "generateLowercaseUUID").mockImplementationOnce(() => {
        return transaction.transactionRef;
      });

      const response = await walletTransferImpl.preprocessTransactionParams(transactionDTO, consumer.props.id);
      expect(response).toStrictEqual(inputTransaction);
    });

    it("should throw ServiceException if debitConsumerIDOrTag is set", async () => {
      const consumer = getRandomConsumer("consumerID");
      const { transactionDTO } = getRandomTransaction(consumer.props.id, "fake-consumer-2");
      transactionDTO.debitConsumerIDOrTag = "fake-consumer-2";

      await expect(walletTransferImpl.preprocessTransactionParams(transactionDTO, consumer.props.id)).rejects.toThrow(
        ServiceException,
      );
    });

    it("should throw ServiceException if creditAmount is set", async () => {
      const consumer = getRandomConsumer("consumerID");
      const { transactionDTO } = getRandomTransaction(consumer.props.id, "fake-consumer-2");
      transactionDTO.creditAmount = 500;

      await expect(walletTransferImpl.preprocessTransactionParams(transactionDTO, consumer.props.id)).rejects.toThrow(
        ServiceException,
      );
    });

    it("should throw ServiceException if debitAmount is less than 0", async () => {
      const consumer = getRandomConsumer("consumerID");
      const { transactionDTO } = getRandomTransaction(consumer.props.id, "fake-consumer-2");
      transactionDTO.debitAmount = -500;

      await expect(walletTransferImpl.preprocessTransactionParams(transactionDTO, consumer.props.id)).rejects.toThrow(
        ServiceException,
      );
    });

    it("should throw ServiceException if debitCurrency is not set", async () => {
      const consumer = getRandomConsumer("consumerID");
      const { transactionDTO } = getRandomTransaction(consumer.props.id, "fake-consumer-2");
      delete transactionDTO.debitCurrency;

      await expect(walletTransferImpl.preprocessTransactionParams(transactionDTO, consumer.props.id)).rejects.toThrow(
        ServiceException,
      );
    });
  });

  describe("initiateWorkflow", () => {
    it("should initiate a WALLET_TRANSFER workflow", async () => {
      const consumer = getRandomConsumer("consumerID");
      const { transaction } = getRandomTransaction(consumer.props.id, "fake-consumer-2");

      when(
        workflowExecutor.executeConsumerWalletTransferWorkflow(anyString(), anyString(), anyNumber(), anyString()),
      ).thenResolve();

      await walletTransferImpl.initiateWorkflow(transaction);

      verify(
        workflowExecutor.executeConsumerWalletTransferWorkflow(
          transaction.debitConsumerID,
          transaction.creditConsumerID,
          transaction.debitAmount,
          transaction.transactionRef,
        ),
      ).once();
    });

    describe("getTransactionQuote", () => {
      it("should throw an error if this method is called for WALLET_TRANSFER transactions", async () => {
        expect(
          async () => await walletTransferImpl.getTransactionQuote(100, Currency.USD, Currency.COP),
        ).rejects.toThrow(ServiceException);
      });
    });
  });
});

const getRandomConsumer = (consumerID: string): Consumer => {
  const email = `${v4()}_${new Date().valueOf()}@noba.com`;
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

const getRandomTransaction = (
  debitConsumerID: string,
  creditConsumerID: string,
): { transaction: Transaction; transactionDTO: InitiateTransactionDTO; inputTransaction: ProcessedTransactionDTO } => {
  const transaction: Transaction = {
    transactionRef: Utils.generateLowercaseUUID(true),
    exchangeRate: 1,
    status: TransactionStatus.INITIATED,
    workflowName: WorkflowName.WALLET_TRANSFER,
    id: v4(),
    sessionKey: v4(),
    memo: "New transaction",
    createdTimestamp: new Date(),
    updatedTimestamp: new Date(),
    transactionFees: [],
  };

  const transactionDTO: InitiateTransactionDTO = {
    workflowName: transaction.workflowName,
    exchangeRate: transaction.exchangeRate,
    memo: transaction.memo,
  };

  const inputTransaction: ProcessedTransactionDTO = {
    workflowName: transaction.workflowName,
    exchangeRate: transaction.exchangeRate,
    memo: transaction.memo,
    transactionFees: [],
  };

  transaction.debitAmount = 100;
  transaction.debitCurrency = "USD";
  transaction.debitConsumerID = debitConsumerID;
  transaction.creditConsumerID = creditConsumerID;

  transactionDTO.debitAmount = transaction.debitAmount;
  transactionDTO.debitCurrency = Currency.USD;
  transactionDTO.creditConsumerIDOrTag = transaction.creditConsumerID;

  inputTransaction.debitAmount = transaction.debitAmount;
  inputTransaction.debitCurrency = transaction.debitCurrency;
  inputTransaction.creditAmount = transaction.debitAmount;
  inputTransaction.creditCurrency = transaction.debitCurrency;

  return { transaction, transactionDTO, inputTransaction };
};
