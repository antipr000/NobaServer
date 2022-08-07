import { Test, TestingModule } from "@nestjs/testing";
import { TestConfigModule } from "../../../../core/utils/AppConfigModule";
import { getTestWinstonModule } from "../../../../core/utils/WinstonModule";
import { anyNumber, anyString, instance, verify, when } from "ts-mockito";
import { TransactionPollerService } from "../../crons/transaction.poller.cron";
import { Transaction } from "../../domain/Transaction";
import { TransactionQueueName, TransactionStatus } from "../../domain/Types";
import { getMockSqsClientWithDefaults } from "../../mocks/mock.sqs.client";
import { getMockTransactionRepoWithDefaults } from "../../mocks/mock.transactions.repo";
import { SqsClient } from "../../queueprocessors/sqs.client";
import { ITransactionRepo } from "../../repo/TransactionRepo";

describe("FiatTransactionInitiator", () => {
  jest.setTimeout(10000);

  let sqsClient: SqsClient;
  let transactionRepo: ITransactionRepo;
  let transactionPoller: TransactionPollerService;

  beforeEach(async () => {
    sqsClient = getMockSqsClientWithDefaults();
    transactionRepo = getMockTransactionRepoWithDefaults();

    const app: TestingModule = await Test.createTestingModule({
      imports: [await TestConfigModule.registerAsync({}), getTestWinstonModule()],
      providers: [
        {
          provide: "TransactionRepo",
          useFactory: () => instance(transactionRepo),
        },
        {
          provide: SqsClient,
          useFactory: () => instance(sqsClient),
        },
        TransactionPollerService,
      ],
    }).compile();

    transactionPoller = app.get<TransactionPollerService>(TransactionPollerService);
  });

  afterEach(async () => {});

  const setupGetTransactionsBeforeTimeMocks = (transactionsPerStaus: Record<string, Transaction[]>) => {
    /**
     * Typescript enum {RED, GREEN, BLUE} will compile to -
     * { 
          '0': 'Red', 
          '1': 'Green',
          '2': 'Blue',
          Red: 0,
          Green: 1,
          Blue: 2
        }
     */
    const allTransactionStatus = Object.keys(TransactionStatus).filter(item => {
      return isNaN(Number(item));
    });

    allTransactionStatus.forEach(status => {
      when(transactionRepo.getTransactionsBeforeTime(anyNumber(), status)).thenResolve(
        transactionsPerStaus[status] ?? [],
      );
    });
  };

  it("should push 'PENDING' transacions to 'PendingTransactionValidation' queue", async () => {
    const transactionIds = ["11111111111", "11111111112", "11111111113", "11111111114", "11111111115"];

    const transactionsWithPendingStatus = [];
    transactionIds.forEach(id => {
      const transaction: Transaction = Transaction.createTransaction({
        _id: id,
        userId: "UUUUUUUUU",
        transactionStatus: TransactionStatus.PENDING,
        paymentMethodID: "XXXXXXXXXX",
        leg1Amount: 1000,
        leg2Amount: 1,
        leg1: "USD",
        leg2: "ETH",
      });
      transactionsWithPendingStatus.push(transaction);
    });

    setupGetTransactionsBeforeTimeMocks({
      [TransactionStatus.PENDING]: transactionsWithPendingStatus,
    });
    when(sqsClient.enqueue(anyString(), anyString())).thenResolve("");

    await transactionPoller.handleCron();

    // Verify whether all the transaction enque requests was sent to `sqsClient`.
    transactionIds.forEach(id => {
      verify(sqsClient.enqueue(TransactionQueueName.PendingTransactionValidation, id)).once();
    });
  });

  it("should push 'VALIDATION_PASSED' transacions to 'FiatTransactionInitiator' queue", async () => {
    const validationPassedTransactionIds = ["21111111111", "21111111112", "21111111113", "21111111114", "21111111115"];

    const transactionsWithValidationPassedStatus = [];
    validationPassedTransactionIds.forEach(id => {
      const transaction: Transaction = Transaction.createTransaction({
        _id: id,
        userId: "UUUUUUUUU",
        transactionStatus: TransactionStatus.VALIDATION_PASSED,
        paymentMethodID: "XXXXXXXXXX",
        leg1Amount: 1000,
        leg2Amount: 1,
        leg1: "USD",
        leg2: "ETH",
      });
      transactionsWithValidationPassedStatus.push(transaction);
    });

    setupGetTransactionsBeforeTimeMocks({
      [TransactionStatus.VALIDATION_PASSED]: transactionsWithValidationPassedStatus,
    });
    when(sqsClient.enqueue(anyString(), anyString())).thenResolve("");

    await transactionPoller.handleCron();

    // Verify whether all the transaction enque requests was sent to `sqsClient`.
    validationPassedTransactionIds.forEach(id => {
      verify(sqsClient.enqueue(TransactionQueueName.FiatTransactionInitiator, id)).once();
    });
  });

  it("should push 'FIAT_INCOMING_INITIATED' transacions to 'FiatTransactionInitiated' queue", async () => {
    const transactionIds = ["11111111111", "11111111112", "11111111113", "11111111114", "11111111115"];

    const transactionsWithFiatIncomingInitiatedStatus = [];
    transactionIds.forEach(id => {
      const transaction: Transaction = Transaction.createTransaction({
        _id: id,
        userId: "UUUUUUUUU",
        transactionStatus: TransactionStatus.FIAT_INCOMING_INITIATED,
        paymentMethodID: "XXXXXXXXXX",
        leg1Amount: 1000,
        leg2Amount: 1,
        leg1: "USD",
        leg2: "ETH",
      });
      transactionsWithFiatIncomingInitiatedStatus.push(transaction);
    });

    setupGetTransactionsBeforeTimeMocks({
      [TransactionStatus.FIAT_INCOMING_INITIATED]: transactionsWithFiatIncomingInitiatedStatus,
    });
    when(sqsClient.enqueue(anyString(), anyString())).thenResolve("");

    await transactionPoller.handleCron();

    // Verify whether all the transaction enque requests was sent to `sqsClient`.
    transactionIds.forEach(id => {
      verify(sqsClient.enqueue(TransactionQueueName.FiatTransactionInitiated, id)).once();
    });
  });

  it("should push 'FIAT_INCOMING_COMPLETED' & 'CRYPTO_OUTGOING_INITIATING' transacions to 'FiatTransactionCompleted' queue", async () => {
    const fiatIncomingTransactionIds = ["11111111111", "11111111112", "11111111113", "11111111114", "11111111115"];
    const cryptoOutgoingTransactionIds = ["21111111111", "21111111112", "21111111113", "21111111114", "21111111115"];

    const transactionsWithFiatTransactionCompletedStatus = [];
    fiatIncomingTransactionIds.forEach(id => {
      const transaction: Transaction = Transaction.createTransaction({
        _id: id,
        userId: "UUUUUUUUU",
        transactionStatus: TransactionStatus.FIAT_INCOMING_COMPLETED,
        paymentMethodID: "XXXXXXXXXX",
        leg1Amount: 1000,
        leg2Amount: 1,
        leg1: "USD",
        leg2: "ETH",
      });
      transactionsWithFiatTransactionCompletedStatus.push(transaction);
    });
    const transactionsWithCryptoOutgoingInitiatingStatus = [];
    cryptoOutgoingTransactionIds.forEach(id => {
      const transaction: Transaction = Transaction.createTransaction({
        _id: id,
        userId: "UUUUUUUUU",
        transactionStatus: TransactionStatus.CRYPTO_OUTGOING_INITIATING,
        paymentMethodID: "XXXXXXXXXX",
        leg1Amount: 1000,
        leg2Amount: 1,
        leg1: "USD",
        leg2: "ETH",
      });
      transactionsWithFiatTransactionCompletedStatus.push(transaction);
    });

    setupGetTransactionsBeforeTimeMocks({
      [TransactionStatus.FIAT_INCOMING_COMPLETED]: transactionsWithFiatTransactionCompletedStatus,
      [TransactionStatus.CRYPTO_OUTGOING_INITIATING]: transactionsWithCryptoOutgoingInitiatingStatus,
    });
    when(sqsClient.enqueue(anyString(), anyString())).thenResolve("");

    await transactionPoller.handleCron();

    // Verify whether all the transaction enque requests was sent to `sqsClient`.
    fiatIncomingTransactionIds.forEach(id => {
      verify(sqsClient.enqueue(TransactionQueueName.FiatTransactionCompleted, id)).once();
    });
    cryptoOutgoingTransactionIds.forEach(id => {
      verify(sqsClient.enqueue(TransactionQueueName.FiatTransactionCompleted, id)).once();
    });
  });

  it("should push 'CRYPTO_OUTGOING_INITIATED' transacions to 'CryptoTransactionInitiated' queue", async () => {
    const transactionIds = ["11111111111", "11111111112", "11111111113", "11111111114", "11111111115"];

    const transactionsWithCryptoTransactionInitiatedStatus = [];
    transactionIds.forEach(id => {
      const transaction: Transaction = Transaction.createTransaction({
        _id: id,
        userId: "UUUUUUUUU",
        transactionStatus: TransactionStatus.CRYPTO_OUTGOING_INITIATED,
        paymentMethodID: "XXXXXXXXXX",
        leg1Amount: 1000,
        leg2Amount: 1,
        leg1: "USD",
        leg2: "ETH",
      });
      transactionsWithCryptoTransactionInitiatedStatus.push(transaction);
    });

    setupGetTransactionsBeforeTimeMocks({
      [TransactionStatus.CRYPTO_OUTGOING_INITIATED]: transactionsWithCryptoTransactionInitiatedStatus,
    });
    when(sqsClient.enqueue(anyString(), anyString())).thenResolve("");

    await transactionPoller.handleCron();

    // Verify whether all the transaction enque requests was sent to `sqsClient`.
    transactionIds.forEach(id => {
      verify(sqsClient.enqueue(TransactionQueueName.CryptoTransactionInitiated, id)).once();
    });
  });

  it("should push 'CRYPTO_OUTGOING_COMPLETED' transacions to 'OnChainPendingTransaction' queue", async () => {
    const transactionIds = ["11111111111", "11111111112", "11111111113", "11111111114", "11111111115"];

    const transactionsWithOnChainPendingTransactionStatus = [];
    transactionIds.forEach(id => {
      const transaction: Transaction = Transaction.createTransaction({
        _id: id,
        userId: "UUUUUUUUU",
        transactionStatus: TransactionStatus.CRYPTO_OUTGOING_COMPLETED,
        paymentMethodID: "XXXXXXXXXX",
        leg1Amount: 1000,
        leg2Amount: 1,
        leg1: "USD",
        leg2: "ETH",
      });
      transactionsWithOnChainPendingTransactionStatus.push(transaction);
    });

    setupGetTransactionsBeforeTimeMocks({
      [TransactionStatus.CRYPTO_OUTGOING_COMPLETED]: transactionsWithOnChainPendingTransactionStatus,
    });
    when(sqsClient.enqueue(anyString(), anyString())).thenResolve("");

    await transactionPoller.handleCron();

    // Verify whether all the transaction enque requests was sent to `sqsClient`.
    transactionIds.forEach(id => {
      verify(sqsClient.enqueue(TransactionQueueName.OnChainPendingTransaction, id)).once();
    });
  });
});
