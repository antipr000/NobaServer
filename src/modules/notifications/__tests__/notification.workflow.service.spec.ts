import { TestingModule, Test } from "@nestjs/testing";
import { getTestWinstonModule } from "../../../core/utils/WinstonModule";
import { TestConfigModule } from "../../../core/utils/AppConfigModule";
import { NotificationService } from "../notification.service";
import { deepEqual, instance, verify, when } from "ts-mockito";
import { NotificationWorkflowService } from "../notification.workflow.service";
import { TransactionService } from "../../../modules/transaction/transaction.service";
import { ConsumerService } from "../../../modules/consumer/consumer.service";
import { getMockNotificationServiceWithDefaults } from "../mocks/mock.notification.service";
import { getMockTransactionServiceWithDefaults } from "../../../modules/transaction/mocks/mock.transaction.service";
import { getMockConsumerServiceWithDefaults } from "../../../modules/consumer/mocks/mock.consumer.service";
import { Transaction, WorkflowName, TransactionStatus } from "../../../modules/transaction/domain/Transaction";
import { v4 } from "uuid";
import { Utils } from "../../../core/utils/Utils";
import { Currency } from "../../../modules/transaction/domain/TransactionTypes";
import { Consumer, ConsumerProps } from "../../../modules/consumer/domain/Consumer";
import { NotificationEventType, NotificationWorkflowTypes } from "../domain/NotificationTypes";
import { TransactionNotificationPayloadMapper } from "../domain/TransactionNotificationParameters";
import { prepareNotificationPayload } from "../domain/NotificationPayload";
import { ServiceException } from "../../../core/exception/service.exception";
import { FeeType } from "../../../modules/transaction/domain/TransactionFee";

describe("NotificationService", () => {
  let notificationService: NotificationService;
  let notificationWorflowService: NotificationWorkflowService;
  let transactionService: TransactionService;
  let consumerService: ConsumerService;
  let transactionNotificationMapper: TransactionNotificationPayloadMapper;

  jest.setTimeout(30000);

  beforeAll(async () => {
    process.env = {
      ...process.env,
      NODE_ENV: "development",
    };

    notificationService = getMockNotificationServiceWithDefaults();
    transactionService = getMockTransactionServiceWithDefaults();
    consumerService = getMockConsumerServiceWithDefaults();
    transactionNotificationMapper = new TransactionNotificationPayloadMapper();

    const app: TestingModule = await Test.createTestingModule({
      imports: [TestConfigModule.registerAsync({}), getTestWinstonModule()],
      controllers: [],
      providers: [
        NotificationWorkflowService,
        {
          provide: NotificationService,
          useFactory: () => instance(notificationService),
        },
        {
          provide: TransactionService,
          useFactory: () => instance(transactionService),
        },
        {
          provide: ConsumerService,
          useFactory: () => instance(consumerService),
        },
      ],
    }).compile();

    notificationWorflowService = app.get<NotificationWorkflowService>(NotificationWorkflowService);
  });

  describe("sendNotification", () => {
    it("should send notification for deposit success", async () => {
      const consumerID = v4();
      const consumer = getRandomConsumer(consumerID);
      const transaction = getRandomTransaction(consumerID);
      when(consumerService.getConsumer(consumerID)).thenResolve(consumer);
      when(transactionService.getTransactionByTransactionID(transaction.id)).thenResolve(transaction);

      await notificationWorflowService.sendNotification(
        NotificationWorkflowTypes.DEPOSIT_COMPLETED_EVENT,
        transaction.id,
      );

      const transactionNotificationPayload =
        transactionNotificationMapper.toDepositCompletedNotificationParameters(transaction);

      const notificationPayload = prepareNotificationPayload(consumer, {
        depositCompletedParams: transactionNotificationPayload,
      });
      verify(
        notificationService.sendNotification(
          NotificationEventType.SEND_DEPOSIT_COMPLETED_EVENT,
          deepEqual(notificationPayload),
        ),
      ).once();
    });

    it("should send notification for deposit failed", async () => {
      const consumerID = v4();
      const consumer = getRandomConsumer(consumerID);
      const transaction = getRandomTransaction(consumerID);
      when(consumerService.getConsumer(consumerID)).thenResolve(consumer);
      when(transactionService.getTransactionByTransactionID(transaction.id)).thenResolve(transaction);

      await notificationWorflowService.sendNotification(NotificationWorkflowTypes.DEPOSIT_FAILED_EVENT, transaction.id);

      const transactionNotificationPayload =
        transactionNotificationMapper.toDepositFailedNotificationParameters(transaction);

      const notificationPayload = prepareNotificationPayload(consumer, {
        depositFailedParams: transactionNotificationPayload,
      });
      verify(
        notificationService.sendNotification(
          NotificationEventType.SEND_DEPOSIT_FAILED_EVENT,
          deepEqual(notificationPayload),
        ),
      ).once();
    });

    it("should send notification for withdrawal", async () => {
      const consumerID = v4();
      const consumer = getRandomConsumer(consumerID);
      const transaction = getRandomTransaction(consumerID);
      when(consumerService.getConsumer(consumerID)).thenResolve(consumer);
      when(transactionService.getTransactionByTransactionID(transaction.id)).thenResolve(transaction);

      await notificationWorflowService.sendNotification(
        NotificationWorkflowTypes.WITHDRAWAL_COMPLETED_EVENT,
        transaction.id,
      );

      const transactionNotificationPayload =
        transactionNotificationMapper.toWithdrawalCompletedNotificationParameters(transaction);

      const notificationPayload = prepareNotificationPayload(consumer, {
        withdrawalCompletedParams: transactionNotificationPayload,
      });
      verify(
        notificationService.sendNotification(
          NotificationEventType.SEND_WITHDRAWAL_COMPLETED_EVENT,
          deepEqual(notificationPayload),
        ),
      ).once();
    });

    it("should send notification for withdrawal failed", async () => {
      const consumerID = v4();
      const consumer = getRandomConsumer(consumerID);
      const transaction = getRandomTransaction(consumerID);
      when(consumerService.getConsumer(consumerID)).thenResolve(consumer);
      when(transactionService.getTransactionByTransactionID(transaction.id)).thenResolve(transaction);

      await notificationWorflowService.sendNotification(
        NotificationWorkflowTypes.WITHDRAWAL_FAILED_EVENT,
        transaction.id,
      );

      const transactionNotificationPayload =
        transactionNotificationMapper.toWithdrawalFailedNotificationParameters(transaction);

      const notificationPayload = prepareNotificationPayload(consumer, {
        withdrawalFailedParams: transactionNotificationPayload,
      });
      verify(
        notificationService.sendNotification(
          NotificationEventType.SEND_WITHDRAWAL_FAILED_EVENT,
          deepEqual(notificationPayload),
        ),
      ).once();
    });

    it("should send notification for transfer success", async () => {
      const consumerID = v4();
      const consumerID2 = v4();
      const consumer = getRandomConsumer(consumerID);
      const consumer2 = getRandomConsumer(consumerID2);
      const transaction = getRandomTransaction(consumerID, consumerID2, WorkflowName.WALLET_TRANSFER);
      when(consumerService.getConsumer(consumerID)).thenResolve(consumer);
      when(consumerService.getConsumer(consumerID2)).thenResolve(consumer2);
      when(transactionService.getTransactionByTransactionID(transaction.id)).thenResolve(transaction);

      await notificationWorflowService.sendNotification(
        NotificationWorkflowTypes.TRANSFER_COMPLETED_EVENT,
        transaction.id,
      );

      const transactionNotificationPayload = transactionNotificationMapper.toTransferCompletedNotificationParameters(
        transaction,
        consumer,
        consumer2,
      );

      const transferReceivedPayload = transactionNotificationMapper.toTransferReceivedNotificationParameters(
        transaction,
        consumer,
        consumer2,
      );

      const notificationPayload = prepareNotificationPayload(consumer, {
        transferCompletedParams: transactionNotificationPayload,
      });

      const creditSideNotificationPayload = prepareNotificationPayload(consumer2, {
        transferReceivedParams: transferReceivedPayload,
      });

      verify(
        notificationService.sendNotification(
          NotificationEventType.SEND_TRANSFER_COMPLETED_EVENT,
          deepEqual(notificationPayload),
        ),
      ).once();

      verify(
        notificationService.sendNotification(
          NotificationEventType.SEND_TRANSFER_RECEIVED_EVENT,
          deepEqual(creditSideNotificationPayload),
        ),
      ).once();
    });

    it("should send notification for transfer failed", async () => {
      const consumerID = v4();
      const consumerID2 = v4();
      const consumer = getRandomConsumer(consumerID);
      const consumer2 = getRandomConsumer(consumerID2);
      const transaction = getRandomTransaction(consumerID, consumerID2, WorkflowName.WALLET_TRANSFER);
      when(consumerService.getConsumer(consumerID)).thenResolve(consumer);
      when(consumerService.getConsumer(consumerID2)).thenResolve(consumer2);
      when(transactionService.getTransactionByTransactionID(transaction.id)).thenResolve(transaction);

      await notificationWorflowService.sendNotification(
        NotificationWorkflowTypes.TRANSFER_FAILED_EVENT,
        transaction.id,
      );

      const transactionNotificationPayload = transactionNotificationMapper.toTransferFailedNotificationParameters(
        transaction,
        consumer,
        consumer2,
      );

      const notificationPayload = prepareNotificationPayload(consumer, {
        transferFailedParams: transactionNotificationPayload,
      });
      verify(
        notificationService.sendNotification(
          NotificationEventType.SEND_TRANSFER_FAILED_EVENT,
          deepEqual(notificationPayload),
        ),
      ).once();
    });

    it("should throw ServiceException when transaction is not found", async () => {
      const transactionID = v4();
      when(transactionService.getTransactionByTransactionID(transactionID)).thenResolve(null);

      await expect(
        notificationWorflowService.sendNotification(NotificationWorkflowTypes.DEPOSIT_COMPLETED_EVENT, transactionID),
      ).rejects.toThrowError(ServiceException);
    });

    it("should throw ServiceException when notification type is not found", async () => {
      const transactionID = v4();
      const transaction = getRandomTransaction(v4());
      when(transactionService.getTransactionByTransactionID(transactionID)).thenResolve(transaction);

      await expect(
        notificationWorflowService.sendNotification("INVALID_TYPE" as any, transactionID),
      ).rejects.toThrowError(ServiceException);
    });
  });
});

function getRandomTransaction(
  consumerID: string,
  consumerID2?: string,
  workflowName: WorkflowName = WorkflowName.WALLET_WITHDRAWAL,
): Transaction {
  const transaction: Transaction = {
    transactionRef: Utils.generateLowercaseUUID(true),
    exchangeRate: 1,
    status: TransactionStatus.INITIATED,
    workflowName: workflowName,
    id: v4(),
    sessionKey: v4(),
    memo: "New transaction",
    createdTimestamp: new Date(),
    updatedTimestamp: new Date(),
    transactionFees: [
      {
        id: v4(),
        timestamp: new Date(),
        amount: 0.37,
        type: FeeType.PROCESSING,
        currency: "USD",
      },
      {
        id: v4(),
        timestamp: new Date(),
        amount: 0.2,
        type: FeeType.NOBA,
        currency: "USD",
      },
    ],
  };

  switch (workflowName) {
    case WorkflowName.WALLET_TRANSFER:
      transaction.debitAmount = 100;
      transaction.debitCurrency = "USD";
      transaction.debitConsumerID = consumerID;
      transaction.creditConsumerID = consumerID2;
      break;
    case WorkflowName.WALLET_WITHDRAWAL:
      transaction.debitAmount = 100;
      transaction.debitConsumerID = consumerID;
      transaction.debitCurrency = Currency.COP;
      break;
    case WorkflowName.WALLET_DEPOSIT:
      transaction.debitAmount = 100;
      transaction.debitCurrency = Currency.COP;
      transaction.debitConsumerID = consumerID;
      break;
  }
  return transaction;
}

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
