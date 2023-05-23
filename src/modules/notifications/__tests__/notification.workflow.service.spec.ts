import { TestingModule, Test } from "@nestjs/testing";
import { getTestWinstonModule } from "../../../core/utils/WinstonModule";
import { TestConfigModule } from "../../../core/utils/AppConfigModule";
import { NotificationService } from "../notification.service";
import { anyString, anything, deepEqual, instance, verify, when } from "ts-mockito";
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
import { ServiceErrorCode, ServiceException } from "../../../core/exception/service.exception";
import { FeeType } from "../../../modules/transaction/domain/TransactionFee";
import { EmployerService } from "../../../modules/employer/employer.service";
import { getMockEmployerServiceWithDefaults } from "../../../modules/employer/mocks/mock.employer.service";
import { PayrollStatus } from "../../../modules/employer/domain/Payroll";
import { Employer } from "../../../modules/employer/domain/Employer";
import { NotificationPayloadMapper } from "../domain/NotificationPayload";
import { ReminderScheduleRepo } from "../repos/reminder.schedule.repo";
import { ReminderHistoryRepo } from "../repos/reminder.history.repo";
import { EventRepo } from "../repos/event.repo";
import { getMockReminderScheduleRepoWithDefaults } from "../mocks/mock.reminder.schedule.repo";
import { getMockReminderHistoryRepoWithDefaults } from "../mocks/mock.reminder.history.repo";
import { getMockEventRepoWithDefaults } from "../mocks/mock.event.repo";
import { ReminderSchedule } from "../domain/ReminderSchedule";
import { ReminderHistory } from "../domain/ReminderHistory";
import { Event } from "../domain/Event";

describe("NotificationService", () => {
  let notificationService: NotificationService;
  let notificationWorflowService: NotificationWorkflowService;
  let transactionService: TransactionService;
  let consumerService: ConsumerService;
  let transactionNotificationMapper: TransactionNotificationPayloadMapper;
  let employerService: EmployerService;
  let mockReminderScheduleRepo: ReminderScheduleRepo;
  let mockReminderHistoryRepo: ReminderHistoryRepo;
  let mockEventRepo: EventRepo;

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
    mockReminderScheduleRepo = getMockReminderScheduleRepoWithDefaults();
    mockReminderHistoryRepo = getMockReminderHistoryRepoWithDefaults();
    mockEventRepo = getMockEventRepoWithDefaults();

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
        {
          provide: "ReminderScheduleRepo",
          useFactory: () => instance(mockReminderScheduleRepo),
        },
        {
          provide: "ReminderHistoryRepo",
          useFactory: () => instance(mockReminderHistoryRepo),
        },
        {
          provide: "EventRepo",
          useFactory: () => instance(mockEventRepo),
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

  describe("SendCreditAdjustmentCompletedNotification", () => {
    it("should send credit adjustment notification", async () => {
      const consumerID = uuid();
      const consumer = getRandomConsumer(consumerID);
      consumer.props.locale = "en_us";
      const transaction = getRandomTransaction(consumerID, null, WorkflowName.CREDIT_ADJUSTMENT);
      when(consumerService.getConsumer(consumerID)).thenResolve(consumer);
      when(transactionService.getTransactionByTransactionID(transaction.id)).thenResolve(transaction);

      await notificationWorflowService.sendNotification(NotificationWorkflowTypes.CREDIT_ADJUSTMENT_COMPLETED_EVENT, {
        transactionID: transaction.id,
      });

      const notificationPayload = NotificationPayloadMapper.toCreditAdjustmentCompletedEvent(consumer, transaction);
      verify(
        notificationService.sendNotification(
          NotificationEventType.SEND_CREDIT_ADJUSTMENT_COMPLETED_EVENT,
          deepEqual(notificationPayload),
        ),
      ).once();
    });

    it("should throw 'ServiceException' when transaction is not found", async () => {
      const transactionID = uuid();
      when(transactionService.getTransactionByTransactionID(transactionID)).thenResolve(null);

      await expect(
        notificationWorflowService.sendNotification(NotificationWorkflowTypes.CREDIT_ADJUSTMENT_COMPLETED_EVENT, {
          transactionID: transactionID,
        }),
      ).rejects.toThrowError(ServiceException);
    });

    it("should throw 'ServiceException' when transactionID is null", async () => {
      await expect(
        notificationWorflowService.sendNotification(NotificationWorkflowTypes.CREDIT_ADJUSTMENT_COMPLETED_EVENT, {
          transactionID: null,
        }),
      ).rejects.toThrowError(ServiceException);
    });
  });

  describe("SendDebitAdjustmentCompletedNotification", () => {
    it("should send debit adjustment notification", async () => {
      const consumerID = uuid();
      const consumer = getRandomConsumer(consumerID);
      consumer.props.locale = "en_us";
      const transaction = getRandomTransaction(consumerID, null, WorkflowName.DEBIT_ADJUSTMENT);
      when(consumerService.getConsumer(consumerID)).thenResolve(consumer);
      when(transactionService.getTransactionByTransactionID(transaction.id)).thenResolve(transaction);

      await notificationWorflowService.sendNotification(NotificationWorkflowTypes.DEBIT_ADJUSTMENT_COMPLETED_EVENT, {
        transactionID: transaction.id,
      });

      const notificationPayload = NotificationPayloadMapper.toDebitAdjustmentCompletedEvent(consumer, transaction);
      verify(
        notificationService.sendNotification(
          NotificationEventType.SEND_DEBIT_ADJUSTMENT_COMPLETED_EVENT,
          deepEqual(notificationPayload),
        ),
      ).once();
    });

    it("should throw 'ServiceException' when transaction is not found", async () => {
      const transactionID = uuid();
      when(transactionService.getTransactionByTransactionID(transactionID)).thenResolve(null);

      await expect(
        notificationWorflowService.sendNotification(NotificationWorkflowTypes.DEBIT_ADJUSTMENT_COMPLETED_EVENT, {
          transactionID: transactionID,
        }),
      ).rejects.toThrowError(ServiceException);
    });

    it("should throw 'ServiceException' when transactionID is null", async () => {
      await expect(
        notificationWorflowService.sendNotification(NotificationWorkflowTypes.DEBIT_ADJUSTMENT_COMPLETED_EVENT, {
          transactionID: null,
        }),
      ).rejects.toThrowError(ServiceException);
    });
  });

  describe("SendCreditAdjustmentFailedNotification", () => {
    it("should send credit adjustment failed notification", async () => {
      const consumerID = uuid();
      const consumer = getRandomConsumer(consumerID);
      const transaction = getRandomTransaction(consumerID, null, WorkflowName.CREDIT_ADJUSTMENT);
      when(consumerService.getConsumer(consumerID)).thenResolve(consumer);
      when(transactionService.getTransactionByTransactionID(transaction.id)).thenResolve(transaction);

      await notificationWorflowService.sendNotification(NotificationWorkflowTypes.CREDIT_ADJUSTMENT_FAILED_EVENT, {
        transactionID: transaction.id,
      });

      const notificationPayload = NotificationPayloadMapper.toCreditAdjustmentFailedEvent(consumer, transaction);
      verify(
        notificationService.sendNotification(
          NotificationEventType.SEND_CREDIT_ADJUSTMENT_FAILED_EVENT,
          deepEqual(notificationPayload),
        ),
      ).once();
    });

    it("should throw 'ServiceException' when transaction is not found", async () => {
      const transactionID = uuid();
      when(transactionService.getTransactionByTransactionID(transactionID)).thenResolve(null);

      await expect(
        notificationWorflowService.sendNotification(NotificationWorkflowTypes.CREDIT_ADJUSTMENT_FAILED_EVENT, {
          transactionID: transactionID,
        }),
      ).rejects.toThrowError(ServiceException);
    });

    it("should throw 'ServiceException' when transactionID is null", async () => {
      await expect(
        notificationWorflowService.sendNotification(NotificationWorkflowTypes.CREDIT_ADJUSTMENT_FAILED_EVENT, {
          transactionID: null,
        }),
      ).rejects.toThrowError(ServiceException);
    });
  });

  describe("SendDebitAdjustmentFailedNotification", () => {
    it("should send debit adjustment failed notification", async () => {
      const consumerID = uuid();
      const consumer = getRandomConsumer(consumerID);
      const transaction = getRandomTransaction(consumerID, null, WorkflowName.DEBIT_ADJUSTMENT);
      when(consumerService.getConsumer(consumerID)).thenResolve(consumer);
      when(transactionService.getTransactionByTransactionID(transaction.id)).thenResolve(transaction);

      await notificationWorflowService.sendNotification(NotificationWorkflowTypes.DEBIT_ADJUSTMENT_FAILED_EVENT, {
        transactionID: transaction.id,
      });

      const notificationPayload = NotificationPayloadMapper.toDebitAdjustmentFailedEvent(consumer, transaction);
      verify(
        notificationService.sendNotification(
          NotificationEventType.SEND_DEBIT_ADJUSTMENT_FAILED_EVENT,
          deepEqual(notificationPayload),
        ),
      ).once();
    });

    it("should throw 'ServiceException' when transaction is not found", async () => {
      const transactionID = uuid();
      when(transactionService.getTransactionByTransactionID(transactionID)).thenResolve(null);

      await expect(
        notificationWorflowService.sendNotification(NotificationWorkflowTypes.DEBIT_ADJUSTMENT_FAILED_EVENT, {
          transactionID: transactionID,
        }),
      ).rejects.toThrowError(ServiceException);
    });

    it("should throw 'ServiceException' when transactionID is null", async () => {
      await expect(
        notificationWorflowService.sendNotification(NotificationWorkflowTypes.DEBIT_ADJUSTMENT_FAILED_EVENT, {
          transactionID: null,
        }),
      ).rejects.toThrowError(ServiceException);
    });
  });
  describe("getAllReminderSchedulesForGroup", () => {
    it("should get all reminder schedules for a group", async () => {
      const reminderSchedule: ReminderSchedule = {
        id: "fake-id",
        groupKey: "fake-group-id",
        createdTimestamp: new Date(),
        updatedTimestamp: new Date(),
        eventID: "fake-event-id",
        query: "fake-query",
      };

      when(mockReminderScheduleRepo.getAllReminderSchedulesForGroup("fake-group-id")).thenResolve([reminderSchedule]);

      const result = await notificationWorflowService.getAllReminderSchedulesForGroup("fake-group-id");

      expect(result).toStrictEqual([reminderSchedule]);
    });
  });

  describe("getAllConsumerIDsForReminder", () => {
    it("should get all consumer ids selected by query", async () => {
      const reminderSchedule: ReminderSchedule = {
        id: "fake-id",
        groupKey: "fake-group-id",
        createdTimestamp: new Date(),
        updatedTimestamp: new Date(),
        eventID: "fake-event-id",
        query: "select * from consumers",
      };

      when(mockReminderScheduleRepo.getReminderScheduleByID("fake-id")).thenResolve(reminderSchedule);
      when(consumerService.executeRawQuery(reminderSchedule.query)).thenResolve([{ id: "fake-consumer-id" }]);

      const result = await notificationWorflowService.getAllConsumerIDsForReminder("fake-id");

      expect(result).toStrictEqual(["fake-consumer-id"]);
    });

    it("should throw ServiceException if reminderSchedule with ID does not exist", async () => {
      when(mockReminderScheduleRepo.getReminderScheduleByID("fake-id")).thenResolve(null);

      await expect(notificationWorflowService.getAllConsumerIDsForReminder("fake-id")).rejects.toThrowError(
        ServiceException,
      );
    });
  });

  describe("createReminderSchedule", () => {
    it("should throw ServiceException when eventID is missing", async () => {
      await expect(
        notificationWorflowService.createReminderSchedule({
          groupKey: "fake-group-id",
          query: "select * from consumers",
        } as any),
      ).rejects.toThrowServiceException(ServiceErrorCode.SEMANTIC_VALIDATION);
    });

    it("should throw ServiceException when groupKey is missing", async () => {
      await expect(
        notificationWorflowService.createReminderSchedule({
          eventID: "fake-event-id",
          query: "select * from consumers",
        } as any),
      ).rejects.toThrowServiceException(ServiceErrorCode.SEMANTIC_VALIDATION);
    });

    it("should throw ServiceException when query is missing", async () => {
      await expect(
        notificationWorflowService.createReminderSchedule({
          eventID: "fake-event-id",
          groupKey: "fake-group-id",
        } as any),
      ).rejects.toThrowServiceException(ServiceErrorCode.SEMANTIC_VALIDATION);
    });

    it("should create reminder schedule", async () => {
      const reminderSchedule: ReminderSchedule = {
        id: "fake-id",
        groupKey: "fake-group-id",
        createdTimestamp: new Date(),
        updatedTimestamp: new Date(),
        eventID: "fake-event-id",
        query: "select * from consumers",
      };

      when(mockReminderScheduleRepo.createReminderSchedule(anything())).thenResolve(reminderSchedule);

      const result = await notificationWorflowService.createReminderSchedule({
        eventID: "fake-event-id",
        groupKey: "fake-group-id",
        query: "select * from consumers",
      });

      expect(result).toStrictEqual(reminderSchedule);

      verify(
        mockReminderScheduleRepo.createReminderSchedule(
          deepEqual({
            eventID: "fake-event-id",
            groupKey: "fake-group-id",
            query: "select * from consumers",
          }),
        ),
      ).once();
    });
  });

  describe("createOrUpdateReminderScheduleHistory", () => {
    it("should create reminder schedule history", async () => {
      const reminderID = "fake-reminder-id";
      const consumerID = "fake-consumer-id";
      const lastSentTimestamp = new Date();

      when(
        mockReminderHistoryRepo.getReminderHistoryByReminderScheduleIDAndConsumerID(reminderID, consumerID),
      ).thenResolve(null);

      const reminderHistory: ReminderHistory = {
        id: "fake-id",
        reminderScheduleID: reminderID,
        consumerID: consumerID,
        lastSentTimestamp: lastSentTimestamp,
        createdTimestamp: new Date(),
        updatedTimestamp: new Date(),
      };

      when(mockReminderHistoryRepo.createReminderHistory(anything())).thenResolve(reminderHistory);

      const result = await notificationWorflowService.createOrUpdateReminderScheduleHistory(reminderID, {
        consumerID: consumerID,
        lastSentTimestamp: lastSentTimestamp,
      });

      expect(result).toStrictEqual(reminderHistory);
      verify(
        mockReminderHistoryRepo.createReminderHistory(
          deepEqual({
            reminderScheduleID: reminderID,
            consumerID: consumerID,
            lastSentTimestamp: lastSentTimestamp,
          }),
        ),
      ).once();
      verify(mockReminderHistoryRepo.updateReminderHistory(anyString(), anything())).never();
    });

    it("should update reminder schedule history", async () => {
      const reminderID = "fake-reminder-id-2";
      const consumerID = "fake-consumer-id-2";
      const lastSentTimestamp = new Date();

      const reminderHistory: ReminderHistory = {
        id: "fake-id",
        reminderScheduleID: reminderID,
        consumerID: consumerID,
        lastSentTimestamp: lastSentTimestamp,
        createdTimestamp: new Date(),
        updatedTimestamp: new Date(),
      };

      when(
        mockReminderHistoryRepo.getReminderHistoryByReminderScheduleIDAndConsumerID(reminderID, consumerID),
      ).thenResolve(reminderHistory);

      when(mockReminderHistoryRepo.updateReminderHistory(anyString(), anything())).thenResolve(reminderHistory);

      const result = await notificationWorflowService.createOrUpdateReminderScheduleHistory(reminderID, {
        consumerID: consumerID,
        lastSentTimestamp: lastSentTimestamp,
      });

      expect(result).toStrictEqual(reminderHistory);
      verify(
        mockReminderHistoryRepo.createReminderHistory({
          reminderScheduleID: reminderID,
          consumerID: consumerID,
          lastSentTimestamp: lastSentTimestamp,
        }),
      ).never();
      verify(
        mockReminderHistoryRepo.updateReminderHistory(
          reminderHistory.id,
          deepEqual({
            lastSentTimestamp: lastSentTimestamp,
          }),
        ),
      ).once();
    });

    it("should throw ServiceException if reminderID is null", async () => {
      await expect(
        notificationWorflowService.createOrUpdateReminderScheduleHistory(null, {
          consumerID: "fake-consumer-id",
          lastSentTimestamp: new Date(),
        }),
      ).rejects.toThrowServiceException(ServiceErrorCode.SEMANTIC_VALIDATION);
    });

    it("should throw ServiceException if consumerID is null", async () => {
      await expect(
        notificationWorflowService.createOrUpdateReminderScheduleHistory("fake-reminder-id", {
          consumerID: null,
          lastSentTimestamp: new Date(),
        }),
      ).rejects.toThrowServiceException(ServiceErrorCode.SEMANTIC_VALIDATION);
    });

    it("should throw ServiceException if lastSentTimestamp is null", async () => {
      await expect(
        notificationWorflowService.createOrUpdateReminderScheduleHistory("fake-reminder-id", {
          consumerID: "fake-consumer-id",
          lastSentTimestamp: null,
        }),
      ).rejects.toThrowServiceException(ServiceErrorCode.SEMANTIC_VALIDATION);
    });
  });

  describe("sendEvent", () => {
    it("should send event", async () => {
      const eventID = "fake-event-id";
      const event: Event = {
        id: eventID,
        name: "Fake Name",
        createdTimestamp: new Date(),
        updatedTimestamp: new Date(),
        handlers: [],
        templates: [],
      };

      const consumer = getRandomConsumer("fake-consumer-id");

      when(mockEventRepo.getEventByIDOrName(eventID)).thenResolve(event);
      when(consumerService.getConsumer(consumer.props.id)).thenResolve(consumer);
      when(notificationService.sendNotification(anything(), anything())).thenResolve();

      await notificationWorflowService.sendEvent(eventID, {
        consumerID: consumer.props.id,
      });

      verify(
        notificationService.sendNotification(
          NotificationEventType.SEND_SCHEDULED_REMINDER_EVENT,
          deepEqual({
            email: consumer.props.email,
            firstName: consumer.props.firstName,
            handle: consumer.props.handle,
            lastName: consumer.props.lastName,
            nobaUserID: consumer.props.id,
            phone: consumer.props.phone,
            eventID: eventID,
            locale: consumer.props.locale,
          }),
        ),
      ).once();
    });

    it("should throw ServiceException if eventID does not exist", async () => {
      const eventID = "fake-event-id";

      when(mockEventRepo.getEventByIDOrName(eventID)).thenResolve(null);

      await expect(
        notificationWorflowService.sendEvent(eventID, {
          consumerID: "fake-consumer-id",
        }),
      ).rejects.toThrowServiceException(ServiceErrorCode.DOES_NOT_EXIST);
    });

    it("should throw ServiceException if consumerID is null", async () => {
      const eventID = "fake-event-id";
      const event: Event = {
        id: eventID,
        name: "Fake Name",
        createdTimestamp: new Date(),
        updatedTimestamp: new Date(),
        handlers: [],
        templates: [],
      };

      when(mockEventRepo.getEventByIDOrName(eventID)).thenResolve(event);
      await expect(
        notificationWorflowService.sendEvent("fake-event-id", {
          consumerID: null,
        }),
      ).rejects.toThrowServiceException(ServiceErrorCode.SEMANTIC_VALIDATION);
    });

    it("should throw ServiceException if consumerID does not exist", async () => {
      const eventID = "fake-event-id";
      const event: Event = {
        id: eventID,
        name: "Fake Name",
        createdTimestamp: new Date(),
        updatedTimestamp: new Date(),
        handlers: [],
        templates: [],
      };

      when(mockEventRepo.getEventByIDOrName(eventID)).thenResolve(event);
      when(consumerService.getConsumer("fake-consumer-id")).thenResolve(null);

      await expect(
        notificationWorflowService.sendEvent("fake-event-id", {
          consumerID: "fake-consumer-id",
        }),
      ).rejects.toThrowServiceException(ServiceErrorCode.DOES_NOT_EXIST);
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
    case WorkflowName.CREDIT_ADJUSTMENT:
      transaction.creditAmount = 100;
      transaction.creditCurrency = Currency.COP;
      transaction.creditConsumerID = consumerID;
      break;
    case WorkflowName.DEBIT_ADJUSTMENT:
      transaction.debitAmount = 100;
      transaction.debitCurrency = Currency.COP;
      transaction.debitConsumerID = consumerID;
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
