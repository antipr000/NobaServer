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
import { ServiceException } from "../../../core/exception/ServiceException";

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
    it("should send notification for transaction success with DEBIT side only", async () => {
      const consumerID = v4();
      const consumer = getRandomConsumer(consumerID);
      const transaction = getRandomTransaction(consumerID);
      when(consumerService.getConsumer(consumerID)).thenResolve(consumer);
      when(transactionService.getTransactionByTransactionID(transaction.id)).thenResolve(transaction);

      await notificationWorflowService.sendNotification(
        NotificationWorkflowTypes.TRANSACTION_COMPLETED_EVENT,
        transaction.id,
      );

      const transactionNotificationPayload =
        transactionNotificationMapper.toTransactionExecutedNotificationParameters(transaction);

      const notificationPayload = prepareNotificationPayload(consumer, {
        transactionExecutedParams: transactionNotificationPayload,
      });
      verify(
        notificationService.sendNotification(
          NotificationEventType.SEND_TRANSACTION_COMPLETED_EVENT,
          deepEqual(notificationPayload),
        ),
      ).once();
    });

    it("should send notification for transaction success with DEBIT and CREDIT side", async () => {
      const consumerID = v4();
      const consumerID2 = v4();
      const consumer = getRandomConsumer(consumerID);
      const consumer2 = getRandomConsumer(consumerID2);
      const transaction = getRandomTransaction(consumerID, consumerID2, WorkflowName.WALLET_TRANSFER);
      when(consumerService.getConsumer(consumerID)).thenResolve(consumer);
      when(consumerService.getConsumer(consumerID2)).thenResolve(consumer2);
      when(transactionService.getTransactionByTransactionID(transaction.id)).thenResolve(transaction);

      await notificationWorflowService.sendNotification(
        NotificationWorkflowTypes.TRANSACTION_COMPLETED_EVENT,
        transaction.id,
      );

      const transactionNotificationPayload =
        transactionNotificationMapper.toTransactionExecutedNotificationParameters(transaction);

      const notificationPayload = prepareNotificationPayload(consumer, {
        transactionExecutedParams: transactionNotificationPayload,
      });

      const notificationPayload2 = prepareNotificationPayload(consumer2, {
        transactionExecutedParams: transactionNotificationPayload,
      });
      verify(
        notificationService.sendNotification(
          NotificationEventType.SEND_TRANSACTION_COMPLETED_EVENT,
          deepEqual(notificationPayload),
        ),
      ).once();

      verify(
        notificationService.sendNotification(
          NotificationEventType.SEND_TRANSACTION_COMPLETED_EVENT,
          deepEqual(notificationPayload2),
        ),
      ).once();
    });

    it("should send transaction failure for DEBIT side", async () => {
      const consumerID = v4();
      const consumer = getRandomConsumer(consumerID);
      const transaction = getRandomTransaction(consumerID);
      when(consumerService.getConsumer(consumerID)).thenResolve(consumer);
      when(transactionService.getTransactionByTransactionID(transaction.id)).thenResolve(transaction);

      await notificationWorflowService.sendNotification(
        NotificationWorkflowTypes.TRANSACTION_FAILED_EVENT,
        transaction.id,
      );

      const transactionNotificationPayload =
        transactionNotificationMapper.toTransactionFailedNotificationParameters(transaction);

      const notificationPayload = prepareNotificationPayload(consumer, {
        transactionFailedParams: transactionNotificationPayload,
      });
      verify(
        notificationService.sendNotification(
          NotificationEventType.SEND_TRANSACTION_FAILED_EVENT,
          deepEqual(notificationPayload),
        ),
      ).once();
    });

    it("should send failure event for CREDIT side", async () => {
      const consumerID = v4();
      const consumer = getRandomConsumer(consumerID);
      const transaction = getRandomTransaction(consumerID, null, WorkflowName.WALLET_WITHDRAWAL);
      when(consumerService.getConsumer(consumerID)).thenResolve(consumer);
      when(transactionService.getTransactionByTransactionID(transaction.id)).thenResolve(transaction);

      await notificationWorflowService.sendNotification(
        NotificationWorkflowTypes.TRANSACTION_FAILED_EVENT,
        transaction.id,
      );

      const transactionNotificationPayload =
        transactionNotificationMapper.toTransactionFailedNotificationParameters(transaction);

      const notificationPayload = prepareNotificationPayload(consumer, {
        transactionFailedParams: transactionNotificationPayload,
      });
      verify(
        notificationService.sendNotification(
          NotificationEventType.SEND_TRANSACTION_FAILED_EVENT,
          deepEqual(notificationPayload),
        ),
      ).once();
    });

    it("should send transaction failure event for DEBIT side only when both sides are present", async () => {
      const consumerID = v4();
      const consumerID2 = v4();
      const consumer = getRandomConsumer(consumerID);
      const consumer2 = getRandomConsumer(consumerID2);
      const transaction = getRandomTransaction(consumerID, consumerID2, WorkflowName.WALLET_TRANSFER);
      when(consumerService.getConsumer(consumerID)).thenResolve(consumer);
      when(consumerService.getConsumer(consumerID2)).thenResolve(consumer2);
      when(transactionService.getTransactionByTransactionID(transaction.id)).thenResolve(transaction);

      await notificationWorflowService.sendNotification(
        NotificationWorkflowTypes.TRANSACTION_FAILED_EVENT,
        transaction.id,
      );

      const transactionNotificationPayload =
        transactionNotificationMapper.toTransactionFailedNotificationParameters(transaction);

      const notificationPayload = prepareNotificationPayload(consumer, {
        transactionFailedParams: transactionNotificationPayload,
      });

      const notificationPayload2 = prepareNotificationPayload(consumer2, {
        transactionFailedParams: transactionNotificationPayload,
      });
      verify(
        notificationService.sendNotification(
          NotificationEventType.SEND_TRANSACTION_FAILED_EVENT,
          deepEqual(notificationPayload),
        ),
      ).once();

      verify(
        notificationService.sendNotification(
          NotificationEventType.SEND_TRANSACTION_FAILED_EVENT,
          deepEqual(notificationPayload2),
        ),
      ).never();
    });

    it("should throw ServiceException when transaction is not found", async () => {
      const transactionID = v4();
      when(transactionService.getTransactionByTransactionID(transactionID)).thenResolve(null);

      await expect(
        notificationWorflowService.sendNotification(
          NotificationWorkflowTypes.TRANSACTION_COMPLETED_EVENT,
          transactionID,
        ),
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
      transaction.creditConsumerID = consumerID;
      transaction.creditCurrency = Currency.COP;
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
