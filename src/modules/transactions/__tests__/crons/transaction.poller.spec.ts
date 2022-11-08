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
import { PaymentProvider } from "../../../../modules/consumer/domain/PaymentProvider";

describe("TransactionPoller", () => {
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

  const setupGetValidTransactionsToProcessMocks = (transactionsPerStaus: Record<string, Transaction[]>) => {
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
      when(transactionRepo.getValidTransactionsToProcess(anyNumber(), anyNumber(), status as any)).thenResolve(
        transactionsPerStaus[status] ?? [],
      );
    });
  };

  const setupGetStaleTransactionsToProcessMocks = (transactionsPerStaus: Record<string, Transaction[]>) => {
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
      when(transactionRepo.getStaleTransactionsToProcess(anyNumber(), anyNumber(), status as any)).thenResolve(
        transactionsPerStaus[status] ?? [],
      );
    });
  };

  describe("ValidTransactionPoller", () => {
    it("should push 'PENDING' transacions to 'PendingTransactionValidation' queue", async () => {
      const transactionIds = ["11111111111", "11111111112", "11111111113", "11111111114", "11111111115"];

      const transactionsWithPendingStatus = [];
      transactionIds.forEach(id => {
        const transaction: Transaction = Transaction.createTransaction({
          _id: id,
          userId: "UUUUUUUUU",
          transactionStatus: TransactionStatus.PENDING,
          fiatPaymentInfo: {
            paymentMethodID: "XXXXXXXXXX",
            isCompleted: false,
            isApproved: false,
            isFailed: false,
            details: [],
            paymentProvider: PaymentProvider.CHECKOUT,
          },
          leg1Amount: 1000,
          leg2Amount: 1,
          leg1: "USD",
          leg2: "ETH",
          partnerID: "12345",
        });
        transactionsWithPendingStatus.push(transaction);
      });

      setupGetValidTransactionsToProcessMocks({
        [TransactionStatus.PENDING]: transactionsWithPendingStatus,
      });
      when(sqsClient.enqueue(anyString(), anyString())).thenResolve("");

      await transactionPoller.validTransactionCron();

      // Verify whether all the transaction enque requests was sent to `sqsClient`.
      transactionIds.forEach(id => {
        verify(sqsClient.enqueue(TransactionQueueName.PendingTransactionValidation, id)).once();
      });
    });

    it("should push 'VALIDATION_PASSED' transacions to 'FiatTransactionInitiator' queue", async () => {
      const validationPassedTransactionIds = [
        "21111111111",
        "21111111112",
        "21111111113",
        "21111111114",
        "21111111115",
      ];

      const transactionsWithValidationPassedStatus = [];
      validationPassedTransactionIds.forEach(id => {
        const transaction: Transaction = Transaction.createTransaction({
          _id: id,
          userId: "UUUUUUUUU",
          transactionStatus: TransactionStatus.VALIDATION_PASSED,
          fiatPaymentInfo: {
            paymentMethodID: "XXXXXXXXXX",
            isCompleted: false,
            isApproved: false,
            isFailed: false,
            details: [],
            paymentProvider: PaymentProvider.CHECKOUT,
          },
          leg1Amount: 1000,
          leg2Amount: 1,
          leg1: "USD",
          leg2: "ETH",
          partnerID: "12345",
        });
        transactionsWithValidationPassedStatus.push(transaction);
      });

      setupGetValidTransactionsToProcessMocks({
        [TransactionStatus.VALIDATION_PASSED]: transactionsWithValidationPassedStatus,
      });
      when(sqsClient.enqueue(anyString(), anyString())).thenResolve("");

      await transactionPoller.validTransactionCron();

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
          fiatPaymentInfo: {
            paymentMethodID: "XXXXXXXXXX",
            isCompleted: false,
            isApproved: false,
            isFailed: false,
            details: [],
            paymentProvider: PaymentProvider.CHECKOUT,
          },
          leg1Amount: 1000,
          leg2Amount: 1,
          leg1: "USD",
          leg2: "ETH",
          partnerID: "12345",
        });
        transactionsWithFiatIncomingInitiatedStatus.push(transaction);
      });

      setupGetValidTransactionsToProcessMocks({
        [TransactionStatus.FIAT_INCOMING_INITIATED]: transactionsWithFiatIncomingInitiatedStatus,
      });
      when(sqsClient.enqueue(anyString(), anyString())).thenResolve("");

      await transactionPoller.validTransactionCron();

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
          fiatPaymentInfo: {
            paymentMethodID: "XXXXXXXXXX",
            isCompleted: false,
            isApproved: false,
            isFailed: false,
            details: [],
            paymentProvider: PaymentProvider.CHECKOUT,
          },
          leg1Amount: 1000,
          leg2Amount: 1,
          leg1: "USD",
          leg2: "ETH",
          partnerID: "12345",
        });
        transactionsWithFiatTransactionCompletedStatus.push(transaction);
      });
      const transactionsWithCryptoOutgoingInitiatingStatus = [];
      cryptoOutgoingTransactionIds.forEach(id => {
        const transaction: Transaction = Transaction.createTransaction({
          _id: id,
          userId: "UUUUUUUUU",
          transactionStatus: TransactionStatus.CRYPTO_OUTGOING_INITIATING,
          fiatPaymentInfo: {
            paymentMethodID: "XXXXXXXXXX",
            isCompleted: false,
            isApproved: false,
            isFailed: false,
            details: [],
            paymentProvider: PaymentProvider.CHECKOUT,
          },
          leg1Amount: 1000,
          leg2Amount: 1,
          leg1: "USD",
          leg2: "ETH",
          partnerID: "12345",
        });
        transactionsWithFiatTransactionCompletedStatus.push(transaction);
      });

      setupGetValidTransactionsToProcessMocks({
        [TransactionStatus.FIAT_INCOMING_COMPLETED]: transactionsWithFiatTransactionCompletedStatus,
        [TransactionStatus.CRYPTO_OUTGOING_INITIATING]: transactionsWithCryptoOutgoingInitiatingStatus,
      });
      when(sqsClient.enqueue(anyString(), anyString())).thenResolve("");

      await transactionPoller.validTransactionCron();

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
          fiatPaymentInfo: {
            paymentMethodID: "XXXXXXXXXX",
            isCompleted: false,
            isApproved: false,
            isFailed: false,
            details: [],
            paymentProvider: PaymentProvider.CHECKOUT,
          },
          leg1Amount: 1000,
          leg2Amount: 1,
          leg1: "USD",
          leg2: "ETH",
          partnerID: "12345",
        });
        transactionsWithCryptoTransactionInitiatedStatus.push(transaction);
      });

      setupGetValidTransactionsToProcessMocks({
        [TransactionStatus.CRYPTO_OUTGOING_INITIATED]: transactionsWithCryptoTransactionInitiatedStatus,
      });
      when(sqsClient.enqueue(anyString(), anyString())).thenResolve("");

      await transactionPoller.validTransactionCron();

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
          fiatPaymentInfo: {
            paymentMethodID: "XXXXXXXXXX",
            isCompleted: false,
            isApproved: false,
            isFailed: false,
            details: [],
            paymentProvider: PaymentProvider.CHECKOUT,
          },
          leg1Amount: 1000,
          leg2Amount: 1,
          leg1: "USD",
          leg2: "ETH",
          partnerID: "12345",
        });
        transactionsWithOnChainPendingTransactionStatus.push(transaction);
      });

      setupGetValidTransactionsToProcessMocks({
        [TransactionStatus.CRYPTO_OUTGOING_COMPLETED]: transactionsWithOnChainPendingTransactionStatus,
      });
      when(sqsClient.enqueue(anyString(), anyString())).thenResolve("");

      await transactionPoller.validTransactionCron();

      // Verify whether all the transaction enque requests was sent to `sqsClient`.
      transactionIds.forEach(id => {
        verify(sqsClient.enqueue(TransactionQueueName.OnChainPendingTransaction, id)).once();
      });
    });

    it("should skip transacions which haven't been updated since 15 mins", async () => {
      const transactionIds = [];

      const allTransactionQueues = Object.keys(TransactionQueueName).filter(item => {
        return isNaN(Number(item));
      });
      const allTransactionStatus = Object.keys(TransactionStatus).filter(item => {
        return isNaN(Number(item));
      });
      const statusToTransactionsMap = {};

      allTransactionStatus.forEach((status, index) => {
        const transactionId = `111111111${index}${index}`;
        const transaction: Transaction = Transaction.createTransaction({
          _id: transactionId,
          userId: "UUUUUUUUU",
          transactionStatus: status as any,
          fiatPaymentInfo: {
            paymentMethodID: "XXXXXXXXXX",
            isCompleted: false,
            isApproved: false,
            isFailed: false,
            details: [],
            paymentProvider: PaymentProvider.CHECKOUT,
          },
          leg1Amount: 1000,
          leg2Amount: 1,
          leg1: "USD",
          leg2: "ETH",
          partnerID: "12345",
          lastProcessingTimestamp: Date.now() - 60 * 60 * 1000,
          lastStatusUpdateTimestamp: Date.now().valueOf() - 15 * 60 * 1000,
        });

        transactionIds.push(transactionId);
      });

      setupGetValidTransactionsToProcessMocks(statusToTransactionsMap);
      when(sqsClient.enqueue(anyString(), anyString())).thenResolve("");

      await transactionPoller.validTransactionCron();

      // Verify whether all the transaction enque requests was sent to `sqsClient`.
      allTransactionQueues.forEach(transactionQueue => {
        transactionIds.forEach(id => {
          verify(sqsClient.enqueue(transactionQueue, id)).never();
        });
      });
    });
  });

  describe("StaleTransactionPoller", () => {
    it("should fetch transaction for all the transaction status but never enqueue them", async () => {
      const transactionIds = [];

      const allTransactionQueues = Object.keys(TransactionQueueName).filter(item => {
        return isNaN(Number(item));
      });
      const allTransactionStatus = Object.keys(TransactionStatus).filter(item => {
        return isNaN(Number(item));
      });
      const statusToTransactionsMap = {};

      allTransactionStatus.forEach((status, index) => {
        const transactionId = `111111111${index}${index}`;
        const transaction: Transaction = Transaction.createTransaction({
          _id: transactionId,
          userId: "UUUUUUUUU",
          transactionStatus: status as any,
          fiatPaymentInfo: {
            paymentMethodID: "XXXXXXXXXX",
            isCompleted: false,
            isApproved: false,
            isFailed: false,
            details: [],
            paymentProvider: PaymentProvider.CHECKOUT,
          },
          leg1Amount: 1000,
          leg2Amount: 1,
          leg1: "USD",
          leg2: "ETH",
          partnerID: "12345",
          lastProcessingTimestamp: Date.now() - 60 * 60 * 1000,
          lastStatusUpdateTimestamp: Date.now().valueOf() - 15 * 60 * 1000,
        });

        statusToTransactionsMap[transaction.props.transactionStatus] = [transaction];
        transactionIds.push(transactionId);
      });

      setupGetStaleTransactionsToProcessMocks(statusToTransactionsMap);
      await transactionPoller.invalidTransactionCron();

      // Verify whether all the transaction enque requests was sent to `sqsClient`.
      allTransactionQueues.forEach(transactionQueue => {
        transactionIds.forEach(id => {
          verify(sqsClient.enqueue(transactionQueue, id)).never();
        });
      });
      allTransactionStatus.forEach(status => {
        // Fiat reversal is not yet integrated. So, skip them.
        if (
          status === TransactionStatus.FIAT_REVERSAL_INITIATING ||
          status === TransactionStatus.FIAT_INCOMING_REVERSAL_INITIATED ||
          status === TransactionStatus.FIAT_INCOMING_REVERSED ||
          status === TransactionStatus.FIAT_INCOMING_REVERSAL_FAILED ||
          status === TransactionStatus.COMPLETED ||
          status === TransactionStatus.FAILED
        )
          return;

        verify(transactionRepo.getStaleTransactionsToProcess(anyNumber(), anyNumber(), status as any)).once();
      });
    });
  });
});
