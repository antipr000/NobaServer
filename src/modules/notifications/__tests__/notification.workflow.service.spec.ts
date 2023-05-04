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
import { uuid } from "uuidv4";
import { Utils } from "../../../core/utils/Utils";
import { Currency } from "../../../modules/transaction/domain/TransactionTypes";
import { Consumer, ConsumerProps } from "../../../modules/consumer/domain/Consumer";
import { NotificationEventType, NotificationWorkflowTypes } from "../domain/NotificationTypes";
import { TransactionNotificationPayloadMapper } from "../domain/TransactionNotificationParameters";
import { ServiceException } from "../../../core/exception/service.exception";
import { FeeType } from "../../../modules/transaction/domain/TransactionFee";
import { EmployerService } from "../../../modules/employer/employer.service";
import { getMockEmployerServiceWithDefaults } from "../../../modules/employer/mocks/mock.employer.service";
import { PayrollStatus } from "../../../modules/employer/domain/Payroll";
import { Employer } from "../../../modules/employer/domain/Employer";
import { NotificationPayloadMapper } from "../domain/NotificationPayload";

describe("NotificationService", () => {
  let notificationService: NotificationService;
  let notificationWorflowService: NotificationWorkflowService;
  let transactionService: TransactionService;
  let consumerService: ConsumerService;
  let transactionNotificationMapper: TransactionNotificationPayloadMapper;
  let employerService: EmployerService;

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
    employerService = getMockEmployerServiceWithDefaults();

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
        {
          provide: EmployerService,
          useFactory: () => instance(employerService),
        },
      ],
    }).compile();

    notificationWorflowService = app.get<NotificationWorkflowService>(NotificationWorkflowService);
  });

  describe("sendTransactionNotification", () => {
    it("should send notification for deposit success", async () => {
      const consumerID = uuid();
      const consumer = getRandomConsumer(consumerID);
      const transaction = getRandomTransaction(consumerID);
      when(consumerService.getConsumer(consumerID)).thenResolve(consumer);
      when(transactionService.getTransactionByTransactionID(transaction.id)).thenResolve(transaction);

      await notificationWorflowService.sendNotification(NotificationWorkflowTypes.DEPOSIT_COMPLETED_EVENT, {
        transactionID: transaction.id,
      });

      const notificationPayload = NotificationPayloadMapper.toDepositCompletedEvent(consumer, transaction);
      verify(
        notificationService.sendNotification(
          NotificationEventType.SEND_DEPOSIT_COMPLETED_EVENT,
          deepEqual(notificationPayload),
        ),
      ).once();
    });

    it("should send notification for deposit failed", async () => {
      const consumerID = uuid();
      const consumer = getRandomConsumer(consumerID);
      const transaction = getRandomTransaction(consumerID);
      when(consumerService.getConsumer(consumerID)).thenResolve(consumer);
      when(transactionService.getTransactionByTransactionID(transaction.id)).thenResolve(transaction);

      await notificationWorflowService.sendNotification(NotificationWorkflowTypes.DEPOSIT_FAILED_EVENT, {
        transactionID: transaction.id,
      });

      const notificationPayload = NotificationPayloadMapper.toDepositFailedEvent(consumer, transaction);
      verify(
        notificationService.sendNotification(
          NotificationEventType.SEND_DEPOSIT_FAILED_EVENT,
          deepEqual(notificationPayload),
        ),
      ).once();
    });

    it("should send notification for withdrawal", async () => {
      const consumerID = uuid();
      const consumer = getRandomConsumer(consumerID);
      const transaction = getRandomTransaction(consumerID);
      when(consumerService.getConsumer(consumerID)).thenResolve(consumer);
      when(transactionService.getTransactionByTransactionID(transaction.id)).thenResolve(transaction);

      await notificationWorflowService.sendNotification(NotificationWorkflowTypes.WITHDRAWAL_COMPLETED_EVENT, {
        transactionID: transaction.id,
      });

      const notificationPayload = NotificationPayloadMapper.toWithdrawalCompletedEvent(consumer, transaction);
      verify(
        notificationService.sendNotification(
          NotificationEventType.SEND_WITHDRAWAL_COMPLETED_EVENT,
          deepEqual(notificationPayload),
        ),
      ).once();
    });

    it("should send notification for withdrawal failed", async () => {
      const consumerID = uuid();
      const consumer = getRandomConsumer(consumerID);
      const transaction = getRandomTransaction(consumerID);
      when(consumerService.getConsumer(consumerID)).thenResolve(consumer);
      when(transactionService.getTransactionByTransactionID(transaction.id)).thenResolve(transaction);

      await notificationWorflowService.sendNotification(NotificationWorkflowTypes.WITHDRAWAL_FAILED_EVENT, {
        transactionID: transaction.id,
      });

      const notificationPayload = NotificationPayloadMapper.toWithdrawalFailedEvent(consumer, transaction);
      verify(
        notificationService.sendNotification(
          NotificationEventType.SEND_WITHDRAWAL_FAILED_EVENT,
          deepEqual(notificationPayload),
        ),
      ).once();
    });

    it("should send notification for transfer success", async () => {
      const consumerID = uuid();
      const consumerID2 = uuid();
      const consumer = getRandomConsumer(consumerID);
      const consumer2 = getRandomConsumer(consumerID2);
      const transaction = getRandomTransaction(consumerID, consumerID2, WorkflowName.WALLET_TRANSFER);
      when(consumerService.getConsumer(consumerID)).thenResolve(consumer);
      when(consumerService.getConsumer(consumerID2)).thenResolve(consumer2);
      when(transactionService.getTransactionByTransactionID(transaction.id)).thenResolve(transaction);

      await notificationWorflowService.sendNotification(NotificationWorkflowTypes.TRANSFER_COMPLETED_EVENT, {
        transactionID: transaction.id,
      });

      const notificationPayload = NotificationPayloadMapper.toTransferCompletedEvent(consumer, consumer2, transaction);
      const creditSideNotificationPayload = NotificationPayloadMapper.toTransferReceivedEvent(
        consumer,
        consumer2,
        transaction,
      );

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
      const consumerID = uuid();
      const consumerID2 = uuid();
      const consumer = getRandomConsumer(consumerID);
      const consumer2 = getRandomConsumer(consumerID2);
      const transaction = getRandomTransaction(consumerID, consumerID2, WorkflowName.WALLET_TRANSFER);
      when(consumerService.getConsumer(consumerID)).thenResolve(consumer);
      when(consumerService.getConsumer(consumerID2)).thenResolve(consumer2);
      when(transactionService.getTransactionByTransactionID(transaction.id)).thenResolve(transaction);

      await notificationWorflowService.sendNotification(NotificationWorkflowTypes.TRANSFER_FAILED_EVENT, {
        transactionID: transaction.id,
      });

      const notificationPayload = NotificationPayloadMapper.toTransferFailedEvent(consumer, consumer2, transaction);
      verify(
        notificationService.sendNotification(
          NotificationEventType.SEND_TRANSFER_FAILED_EVENT,
          deepEqual(notificationPayload),
        ),
      ).once();
    });

    it("should send notification for payroll deposit success", async () => {
      const consumerID = uuid();
      const employer = getRandomEmployer();
      const consumer = getRandomConsumer(consumerID);
      const transaction = getRandomTransaction(null, consumerID, WorkflowName.PAYROLL_DEPOSIT);
      when(consumerService.getConsumer(consumerID)).thenResolve(consumer);
      when(transactionService.getTransactionByTransactionID(transaction.id)).thenResolve(transaction);
      when(employerService.getEmployerForTransactionID(transaction.id)).thenResolve(employer);

      await notificationWorflowService.sendNotification(NotificationWorkflowTypes.PAYROLL_DEPOSIT_COMPLETED_EVENT, {
        transactionID: transaction.id,
      });
      const notificationPayload = NotificationPayloadMapper.toPayrollDepositCompletedEvent(
        consumer,
        transaction,
        employer.name,
      );
      verify(
        notificationService.sendNotification(
          NotificationEventType.SEND_PAYROLL_DEPOSIT_COMPLETED_EVENT,
          deepEqual(notificationPayload),
        ),
      ).once();
    });

    it("should throw ServiceException when transaction is not found", async () => {
      const transactionID = uuid();
      when(transactionService.getTransactionByTransactionID(transactionID)).thenResolve(null);

      await expect(
        notificationWorflowService.sendNotification(NotificationWorkflowTypes.DEPOSIT_COMPLETED_EVENT, {
          transactionID: transactionID,
        }),
      ).rejects.toThrowError(ServiceException);
    });

    it("should throw ServiceException when notification type is not found", async () => {
      const transactionID = uuid();
      const transaction = getRandomTransaction(uuid());
      when(transactionService.getTransactionByTransactionID(transactionID)).thenResolve(transaction);

      await expect(
        notificationWorflowService.sendNotification("INVALID_TYPE" as any, {
          transactionID: transactionID,
        }),
      ).rejects.toThrowError(ServiceException);
    });

    it("should throw ServiceException when transactionID is not defined", async () => {
      await expect(
        notificationWorflowService.sendNotification(NotificationWorkflowTypes.DEPOSIT_COMPLETED_EVENT, {
          transactionID: undefined,
        }),
      ).rejects.toThrowError(ServiceException);
    });
  });

  describe("SendPayrollStatusUpdateNotification", () => {
    it("should send payroll status update notification", async () => {
      const payrollID = "fake-payroll-id";
      const payrollStatus = PayrollStatus.COMPLETED;

      when(employerService.getPayrollByID(payrollID)).thenResolve({
        id: payrollID,
        status: payrollStatus,
        employerID: "fake-employer-id",
        createdTimestamp: new Date(),
        updatedTimestamp: new Date(),
      } as any);

      await notificationWorflowService.sendNotification(NotificationWorkflowTypes.UPDATE_PAYROLL_STATUS_EVENT, {
        payrollID: payrollID,
        payrollStatus: payrollStatus,
      });

      verify(
        notificationService.sendNotification(
          NotificationEventType.SEND_UPDATE_PAYROLL_STATUS_EVENT,
          deepEqual({
            nobaPayrollID: payrollID,
            payrollStatus,
          }),
        ),
      ).once();
    });

    it("should throw 'ServiceException' when payrollID or payrollStatus is undefined", async () => {
      await expect(
        notificationWorflowService.sendNotification(NotificationWorkflowTypes.UPDATE_PAYROLL_STATUS_EVENT, {
          payrollID: undefined,
          payrollStatus: PayrollStatus.COMPLETED,
        }),
      ).rejects.toThrowError(ServiceException);

      await expect(
        notificationWorflowService.sendNotification(NotificationWorkflowTypes.UPDATE_PAYROLL_STATUS_EVENT, {
          payrollID: "fake-payroll-id",
          payrollStatus: undefined,
        }),
      ).rejects.toThrowError(ServiceException);
    });

    it("should throw 'ServiceException' when payroll is not found", async () => {
      const payrollID = "fake-payroll-id";
      const payrollStatus = PayrollStatus.COMPLETED;

      when(employerService.getPayrollByID(payrollID)).thenResolve(null);

      await expect(
        notificationWorflowService.sendNotification(NotificationWorkflowTypes.UPDATE_PAYROLL_STATUS_EVENT, {
          payrollID: payrollID,
          payrollStatus: payrollStatus,
        }),
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
    id: uuid(),
    sessionKey: uuid(),
    memo: "New transaction",
    createdTimestamp: new Date(),
    updatedTimestamp: new Date(),
    transactionFees: [
      {
        id: uuid(),
        timestamp: new Date(),
        amount: 0.37,
        type: FeeType.PROCESSING,
        currency: "USD",
      },
      {
        id: uuid(),
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
    case WorkflowName.PAYROLL_DEPOSIT:
      transaction.debitAmount = 100;
      transaction.debitCurrency = Currency.COP;
      transaction.creditConsumerID = consumerID2;
      break;
  }
  return transaction;
}

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

const getRandomEmployer = (): Employer => {
  const employer: Employer = {
    id: uuid(),
    name: "Test Employer",
    bubbleID: uuid(),
    logoURI: "https://www.google.com",
    locale: "en_us",
    referralID: uuid(),
    leadDays: 1,
    payrollDates: ["2020-02-29", "2020-03-01", "2020-03-02"],
    createdTimestamp: new Date(),
    updatedTimestamp: new Date(),
  };

  return employer;
};
