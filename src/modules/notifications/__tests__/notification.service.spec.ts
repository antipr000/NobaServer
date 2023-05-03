import { TestingModule, Test } from "@nestjs/testing";
import { getTestWinstonModule } from "../../../core/utils/WinstonModule";
import { TestConfigModule } from "../../../core/utils/AppConfigModule";
import { NotificationService } from "../notification.service";
import { anyString, anything, deepEqual, instance, verify, when } from "ts-mockito";
import { NotificationEventType } from "../domain/NotificationTypes";
import { SENDGRID_API_KEY, SENDGRID_CONFIG_KEY } from "../../../config/ConfigurationUtils";
import { EventEmitter2 } from "@nestjs/event-emitter";
import { getMockEventEmitterWithDefaults } from "../mocks/mock.evetemitter";
import { NotificationPayload } from "../domain/NotificationPayload";
import { SendKycDeniedEvent } from "../events/SendKycDeniedEvent";
import { SendKycPendingOrFlaggedEvent } from "../events/SendKycPendingOrFlaggedEvent";
import { SendDocumentVerificationPendingEvent } from "../events/SendDocumentVerificationPendingEvent";
import { SendDocumentVerificationRejectedEvent } from "../events/SendDocumentVerificationRejectedEvent";
import { SendDocumentVerificationTechnicalFailureEvent } from "../events/SendDocumentVerificationTechnicalFailureEvent";
import { SendDepositCompletedEvent } from "../events/SendDepositCompletedEvent";
import { SendDepositFailedEvent } from "../events/SendDepositFailedEvent";
import { SendDepositInitiatedEvent } from "../events/SendDepositInitiatedEvent";
import { SendWithdrawalCompletedEvent } from "../events/SendWithdrawalCompletedEvent";
import { SendWithdrawalFailedEvent } from "../events/SendWithdrawalFailedEvent";
import { SendWithdrawalInitiatedEvent } from "../events/SendWithdrawalInitiatedEvent";
import { SendTransferCompletedEvent } from "../events/SendTransferCompletedEvent";
import { SendTransferFailedEvent } from "../events/SendTransferFailedEvent";
import { SendTransferReceivedEvent } from "../events/SendTransferReceivedEvent";
import { PayrollStatus } from "../../../modules/employer/domain/Payroll";
import { SendPayrollDepositCompletedEvent } from "../events/SendPayrollDepositCompletedEvent";
import { EventRepo } from "../repos/event.repo";
import { getMockEventRepoWithDefaults } from "../mocks/mock.event.repo";
import { EventHandlers } from "../domain/EventHandlers";
import { SendInviteEmployeeEvent } from "../events/SendInviteEmployeeEvent";

describe("NotificationService", () => {
  let notificationService: NotificationService;
  let eventEmitter: EventEmitter2;
  let mockEventRepo: EventRepo;
  jest.setTimeout(30000);

  beforeEach(async () => {
    eventEmitter = getMockEventEmitterWithDefaults();
    mockEventRepo = getMockEventRepoWithDefaults();

    process.env = {
      ...process.env,
      NODE_ENV: "development",
    };

    const app: TestingModule = await Test.createTestingModule({
      imports: [
        TestConfigModule.registerAsync({
          [SENDGRID_CONFIG_KEY]: {
            [SENDGRID_API_KEY]: "SG.fake_api_key",
          },
        }),
        getTestWinstonModule(),
      ],
      controllers: [],
      providers: [
        NotificationService,
        {
          provide: EventEmitter2,
          useFactory: () => instance(eventEmitter),
        },
        {
          provide: "EventRepo",
          useFactory: () => instance(mockEventRepo),
        },
      ],
    }).compile();

    notificationService = app.get<NotificationService>(NotificationService);
  });

  it("should create email event for otp event when phone is missing", async () => {
    when(eventEmitter.emitAsync(anyString(), anything())).thenResolve();

    when(mockEventRepo.getEventByName(NotificationEventType.SEND_OTP_EVENT)).thenResolve({
      id: "fake-id",
      name: NotificationEventType.SEND_OTP_EVENT,
      handlers: [EventHandlers.EMAIL],
      createdTimestamp: new Date(),
      updatedTimestamp: new Date(),
      templates: [],
    });

    const sendOtpEvent: NotificationPayload = {
      email: "fake+user@noba.com",
      phone: undefined,
      locale: "en",
      otp: "123456",
      firstName: "Fake",
      handle: "fake-handle",
    };

    await notificationService.sendNotification(NotificationEventType.SEND_OTP_EVENT, sendOtpEvent);

    verify(eventEmitter.emitAsync(`email.${NotificationEventType.SEND_OTP_EVENT}`, deepEqual(sendOtpEvent))).once();
  });

  it("should create sms event for otp event when phone is present", async () => {
    when(eventEmitter.emitAsync(anyString(), anything())).thenResolve();

    when(mockEventRepo.getEventByName(NotificationEventType.SEND_OTP_EVENT)).thenResolve({
      id: "fake-id",
      name: NotificationEventType.SEND_OTP_EVENT,
      handlers: [EventHandlers.SMS],
      createdTimestamp: new Date(),
      updatedTimestamp: new Date(),
      templates: [],
    });

    const sendOtpEvent: NotificationPayload = {
      email: undefined,
      phone: "+1234567890",
      locale: "en",
      otp: "123456",
      firstName: "Fake",
      handle: "fake-handle",
    };

    await notificationService.sendNotification(NotificationEventType.SEND_OTP_EVENT, sendOtpEvent);

    verify(eventEmitter.emitAsync(`sms.${NotificationEventType.SEND_OTP_EVENT}`, deepEqual(sendOtpEvent))).once();
  });

  it("should emit SMS event for 'SEND_PHONE_VERIFICATION_CODE_EVENT'", async () => {
    when(eventEmitter.emitAsync(anyString(), anything())).thenResolve();
    when(mockEventRepo.getEventByName(NotificationEventType.SEND_PHONE_VERIFICATION_CODE_EVENT)).thenResolve({
      id: "fake-id",
      name: NotificationEventType.SEND_PHONE_VERIFICATION_CODE_EVENT,
      handlers: [EventHandlers.SMS],
      createdTimestamp: new Date(),
      updatedTimestamp: new Date(),
      templates: [],
    });

    const sendPhoneVerificationCodeEvent: NotificationPayload = {
      phone: "+1234567890",
      locale: "en",
      otp: "123456",
      firstName: "Fake",
      handle: "fake-handle",
    };
    await notificationService.sendNotification(
      NotificationEventType.SEND_PHONE_VERIFICATION_CODE_EVENT,
      sendPhoneVerificationCodeEvent,
    );

    verify(
      eventEmitter.emitAsync(
        `sms.${NotificationEventType.SEND_PHONE_VERIFICATION_CODE_EVENT}`,
        deepEqual(sendPhoneVerificationCodeEvent),
      ),
    ).once();
  });

  it("should not emit any event for 'SEND_PHONE_VERIFICATION_CODE_EVENT' when phone is missing", async () => {
    when(eventEmitter.emitAsync(anyString(), anything())).thenResolve();

    when(mockEventRepo.getEventByName(NotificationEventType.SEND_PHONE_VERIFICATION_CODE_EVENT)).thenResolve({
      id: "fake-id",
      name: NotificationEventType.SEND_PHONE_VERIFICATION_CODE_EVENT,
      handlers: [EventHandlers.SMS],
      createdTimestamp: new Date(),
      updatedTimestamp: new Date(),
      templates: [],
    });

    const sendPhoneVerificationCodeEvent: NotificationPayload = {
      locale: "en",
      otp: "123456",
      firstName: "Fake",
      handle: "fake-handle",
    };
    await notificationService.sendNotification(
      NotificationEventType.SEND_PHONE_VERIFICATION_CODE_EVENT,
      sendPhoneVerificationCodeEvent,
    );

    verify(
      eventEmitter.emitAsync(
        `sms.${NotificationEventType.SEND_PHONE_VERIFICATION_CODE_EVENT}`,
        deepEqual(sendPhoneVerificationCodeEvent),
      ),
    ).never();
  });

  it("should emit Email event for 'SEND_KYC_APPROVED_US_EVENT'", async () => {
    when(eventEmitter.emitAsync(anyString(), anything())).thenResolve();
    when(mockEventRepo.getEventByName(NotificationEventType.SEND_KYC_APPROVED_US_EVENT)).thenResolve({
      id: "fake-id",
      name: NotificationEventType.SEND_KYC_APPROVED_US_EVENT,
      handlers: [EventHandlers.EMAIL],
      createdTimestamp: new Date(),
      updatedTimestamp: new Date(),
      templates: [],
    });

    const sendKycApprovedUSEvent = {
      email: "fake+user@noba.com",
      locale: "en",
      firstName: "Fake",
      lastName: "Name",
      nobaUserID: "fake-noba-user-id",
    };

    await notificationService.sendNotification(
      NotificationEventType.SEND_KYC_APPROVED_US_EVENT,
      sendKycApprovedUSEvent,
    );

    verify(
      eventEmitter.emitAsync(
        `email.${NotificationEventType.SEND_KYC_APPROVED_US_EVENT}`,
        deepEqual(sendKycApprovedUSEvent),
      ),
    ).once();
  });

  it("should emit Email event for 'SEND_KYC_APPROVED_NON_US_EVENT'", async () => {
    when(eventEmitter.emitAsync(anyString(), anything())).thenResolve();

    when(mockEventRepo.getEventByName(NotificationEventType.SEND_KYC_APPROVED_NON_US_EVENT)).thenResolve({
      id: "fake-id",
      name: NotificationEventType.SEND_KYC_APPROVED_NON_US_EVENT,
      handlers: [EventHandlers.EMAIL],
      createdTimestamp: new Date(),
      updatedTimestamp: new Date(),
      templates: [],
    });

    const sendKycApprovedNonUsEvent = {
      email: "fake+user@noba.com",
      locale: "en",
      firstName: "Fake",
      lastName: "Name",
      nobaUserID: "fake-noba-user-id",
    };

    await notificationService.sendNotification(
      NotificationEventType.SEND_KYC_APPROVED_NON_US_EVENT,
      sendKycApprovedNonUsEvent,
    );

    verify(
      eventEmitter.emitAsync(
        `email.${NotificationEventType.SEND_KYC_APPROVED_NON_US_EVENT}`,
        deepEqual(sendKycApprovedNonUsEvent),
      ),
    ).once();
  });

  describe.each([
    [NotificationEventType.SEND_KYC_DENIED_EVENT, {}],
    [NotificationEventType.SEND_KYC_PENDING_OR_FLAGGED_EVENT, {}],
    [NotificationEventType.SEND_DOCUMENT_VERIFICATION_PENDING_EVENT, {}],
    [NotificationEventType.SEND_DOCUMENT_VERIFICATION_REJECTED_EVENT, {}],
    [NotificationEventType.SEND_DOCUMENT_VERIFICATION_TECHNICAL_FAILURE_EVENT, {}],
    [NotificationEventType.SEND_DEPOSIT_COMPLETED_EVENT, {}],
    [NotificationEventType.SEND_DEPOSIT_FAILED_EVENT, {}],
    [NotificationEventType.SEND_DEPOSIT_INITIATED_EVENT, {}],
    [NotificationEventType.SEND_WITHDRAWAL_COMPLETED_EVENT, {}],
    [NotificationEventType.SEND_WITHDRAWAL_FAILED_EVENT, {}],
    [NotificationEventType.SEND_WITHDRAWAL_INITIATED_EVENT, {}],
    [NotificationEventType.SEND_TRANSFER_COMPLETED_EVENT, {}],
    [NotificationEventType.SEND_TRANSFER_RECEIVED_EVENT, {}],
    [NotificationEventType.SEND_PAYROLL_DEPOSIT_COMPLETED_EVENT, {}],
    [NotificationEventType.SEND_INVITE_EMPLOYEE_EVENT, {}],
  ])("Email event tests", (event, options) => {
    it(`should emit Email event for '${event}'`, async () => {
      when(eventEmitter.emitAsync(anyString(), anything())).thenResolve();

      when(mockEventRepo.getEventByName(event)).thenResolve({
        id: "fake-id",
        name: event,
        handlers: [EventHandlers.EMAIL],
        createdTimestamp: new Date(),
        updatedTimestamp: new Date(),
        templates: [],
      });

      const payload: NotificationPayload = getNotificationPayload(event);

      await notificationService.sendNotification(event, payload);

      verify(
        eventEmitter.emitAsync(
          `email.${event}`,
          deepEqual({
            ...payload,
            ...options,
          }),
        ),
      ).once();
    });
  });

  describe("Dashboard Events", () => {
    it("should emit 'SEND_REGISTER_NEW_EMPLOYEE_EVENT' event in dashboard", async () => {
      when(eventEmitter.emitAsync(anyString(), anything())).thenResolve();

      when(mockEventRepo.getEventByName(NotificationEventType.SEND_REGISTER_NEW_EMPLOYEE_EVENT)).thenResolve({
        id: "fake-id",
        name: NotificationEventType.SEND_REGISTER_NEW_EMPLOYEE_EVENT,
        handlers: [EventHandlers.DASHBOARD],
        createdTimestamp: new Date(),
        updatedTimestamp: new Date(),
        templates: [],
      });

      const payload: NotificationPayload = {
        locale: "en",
        firstName: "Fake",
        lastName: "User",
        email: "fake+user@noba.com",
        phone: "+1234567890",
        employerReferralID: "fake-referral-id",
        allocationAmountInPesos: 10000,
        nobaEmployeeID: "fake-employee-id",
      };

      await notificationService.sendNotification(NotificationEventType.SEND_REGISTER_NEW_EMPLOYEE_EVENT, payload);

      verify(
        eventEmitter.emitAsync(
          `dashboard.${NotificationEventType.SEND_REGISTER_NEW_EMPLOYEE_EVENT}`,
          deepEqual(payload),
        ),
      ).once();
    });

    it("should emit 'SEND_UPDATE_EMPLOYEE_ALLOCATION_AMOUNT_EVENT' event in dashboard", async () => {
      when(eventEmitter.emitAsync(anyString(), anything())).thenResolve();

      when(
        mockEventRepo.getEventByName(NotificationEventType.SEND_UPDATE_EMPLOYEE_ALLOCATION_AMOUNT_EVENT),
      ).thenResolve({
        id: "fake-id",
        name: NotificationEventType.SEND_UPDATE_EMPLOYEE_ALLOCATION_AMOUNT_EVENT,
        handlers: [EventHandlers.DASHBOARD],
        createdTimestamp: new Date(),
        updatedTimestamp: new Date(),
        templates: [],
      });

      const payload: NotificationPayload = {
        nobaEmployeeID: "fake-employee-id",
        allocationAmountInPesos: 10000,
      };

      await notificationService.sendNotification(
        NotificationEventType.SEND_UPDATE_EMPLOYEE_ALLOCATION_AMOUNT_EVENT,
        payload,
      );

      verify(
        eventEmitter.emitAsync(
          `dashboard.${NotificationEventType.SEND_UPDATE_EMPLOYEE_ALLOCATION_AMOUNT_EVENT}`,
          deepEqual(payload),
        ),
      ).once();
    });

    it("should emit 'SEND_UPDATE_PAYROLL_STATUS_EVENT' event in dashboard", async () => {
      when(eventEmitter.emitAsync(anyString(), anything())).thenResolve();

      when(mockEventRepo.getEventByName(NotificationEventType.SEND_UPDATE_PAYROLL_STATUS_EVENT)).thenResolve({
        id: "fake-id",
        name: NotificationEventType.SEND_UPDATE_PAYROLL_STATUS_EVENT,
        handlers: [EventHandlers.DASHBOARD],
        createdTimestamp: new Date(),
        updatedTimestamp: new Date(),
        templates: [],
      });

      const payload: NotificationPayload = {
        nobaPayrollID: "fake-payroll-id",
        payrollStatus: PayrollStatus.COMPLETED,
      };

      await notificationService.sendNotification(NotificationEventType.SEND_UPDATE_PAYROLL_STATUS_EVENT, payload);

      verify(
        eventEmitter.emitAsync(
          `dashboard.${NotificationEventType.SEND_UPDATE_PAYROLL_STATUS_EVENT}`,
          deepEqual(payload),
        ),
      ).once();
    });
  });

  describe("Push Events", () => {
    it("should emit push event for DEPOSIT_COMPLETED_EVENT", async () => {
      when(eventEmitter.emitAsync(anyString(), anything())).thenResolve();

      when(mockEventRepo.getEventByName(NotificationEventType.SEND_DEPOSIT_COMPLETED_EVENT)).thenResolve({
        id: "fake-id",
        name: NotificationEventType.SEND_DEPOSIT_COMPLETED_EVENT,
        handlers: [EventHandlers.PUSH],
        createdTimestamp: new Date(),
        updatedTimestamp: new Date(),
        templates: [],
      });

      const payload: NotificationPayload = getNotificationPayload(NotificationEventType.SEND_DEPOSIT_COMPLETED_EVENT);

      await notificationService.sendNotification(NotificationEventType.SEND_DEPOSIT_COMPLETED_EVENT, payload);

      verify(
        eventEmitter.emitAsync(
          `push.${NotificationEventType.SEND_DEPOSIT_COMPLETED_EVENT}`,
          deepEqual({
            ...payload,
          }),
        ),
      ).once();
    });

    it("should emit push event for DEPOSIT_FAILED_EVENT", async () => {
      when(eventEmitter.emitAsync(anyString(), anything())).thenResolve();
      when(mockEventRepo.getEventByName(NotificationEventType.SEND_DEPOSIT_FAILED_EVENT)).thenResolve({
        id: "fake-id",
        name: NotificationEventType.SEND_DEPOSIT_FAILED_EVENT,
        handlers: [EventHandlers.PUSH],
        createdTimestamp: new Date(),
        updatedTimestamp: new Date(),
        templates: [],
      });

      const payload: NotificationPayload = getNotificationPayload(NotificationEventType.SEND_DEPOSIT_FAILED_EVENT);

      await notificationService.sendNotification(NotificationEventType.SEND_DEPOSIT_FAILED_EVENT, payload);

      verify(
        eventEmitter.emitAsync(
          `push.${NotificationEventType.SEND_DEPOSIT_FAILED_EVENT}`,
          deepEqual({
            ...payload,
          }),
        ),
      ).once();
    });

    it("should emit push event for WITHDRAWAL_COMPLETED_EVENT", async () => {
      when(eventEmitter.emitAsync(anyString(), anything())).thenResolve();

      when(mockEventRepo.getEventByName(NotificationEventType.SEND_WITHDRAWAL_COMPLETED_EVENT)).thenResolve({
        id: "fake-id",
        name: NotificationEventType.SEND_WITHDRAWAL_COMPLETED_EVENT,
        handlers: [EventHandlers.PUSH],
        createdTimestamp: new Date(),
        updatedTimestamp: new Date(),
        templates: [],
      });

      const payload: NotificationPayload = getNotificationPayload(
        NotificationEventType.SEND_WITHDRAWAL_COMPLETED_EVENT,
      );

      await notificationService.sendNotification(NotificationEventType.SEND_WITHDRAWAL_COMPLETED_EVENT, payload);
      verify(
        eventEmitter.emitAsync(
          `push.${NotificationEventType.SEND_WITHDRAWAL_COMPLETED_EVENT}`,
          deepEqual({
            ...payload,
          }),
        ),
      ).once();
    });

    it("should emit push event for WITHDRAWAL_FAILED_EVENT", async () => {
      when(eventEmitter.emitAsync(anyString(), anything())).thenResolve();

      when(mockEventRepo.getEventByName(NotificationEventType.SEND_WITHDRAWAL_FAILED_EVENT)).thenResolve({
        id: "fake-id",
        name: NotificationEventType.SEND_WITHDRAWAL_FAILED_EVENT,
        handlers: [EventHandlers.PUSH],
        createdTimestamp: new Date(),
        updatedTimestamp: new Date(),
        templates: [],
      });

      const payload: NotificationPayload = getNotificationPayload(NotificationEventType.SEND_WITHDRAWAL_FAILED_EVENT);

      await notificationService.sendNotification(NotificationEventType.SEND_WITHDRAWAL_FAILED_EVENT, payload);

      verify(
        eventEmitter.emitAsync(
          `push.${NotificationEventType.SEND_WITHDRAWAL_FAILED_EVENT}`,
          deepEqual({
            ...payload,
          }),
        ),
      ).once();
    });

    it("should emit push event for TRANSFER_COMPLETED_EVENT", async () => {
      when(eventEmitter.emitAsync(anyString(), anything())).thenResolve();

      when(mockEventRepo.getEventByName(NotificationEventType.SEND_TRANSFER_COMPLETED_EVENT)).thenResolve({
        id: "fake-id",
        name: NotificationEventType.SEND_TRANSFER_COMPLETED_EVENT,
        handlers: [EventHandlers.PUSH],
        createdTimestamp: new Date(),
        updatedTimestamp: new Date(),
        templates: [],
      });

      const payload: NotificationPayload = getNotificationPayload(NotificationEventType.SEND_TRANSFER_COMPLETED_EVENT);

      await notificationService.sendNotification(NotificationEventType.SEND_TRANSFER_COMPLETED_EVENT, payload);

      verify(
        eventEmitter.emitAsync(
          `push.${NotificationEventType.SEND_TRANSFER_COMPLETED_EVENT}`,
          deepEqual({
            ...payload,
          }),
        ),
      ).once();
    });

    it("should emit push event for TRANSFER_FAILED_EVENT", async () => {
      when(eventEmitter.emitAsync(anyString(), anything())).thenResolve();

      when(mockEventRepo.getEventByName(NotificationEventType.SEND_TRANSFER_FAILED_EVENT)).thenResolve({
        id: "fake-id",
        name: NotificationEventType.SEND_TRANSFER_FAILED_EVENT,
        handlers: [EventHandlers.PUSH],
        createdTimestamp: new Date(),
        updatedTimestamp: new Date(),
        templates: [],
      });

      const payload: NotificationPayload = getNotificationPayload(NotificationEventType.SEND_TRANSFER_FAILED_EVENT);

      await notificationService.sendNotification(NotificationEventType.SEND_TRANSFER_FAILED_EVENT, payload);

      verify(
        eventEmitter.emitAsync(
          `push.${NotificationEventType.SEND_TRANSFER_FAILED_EVENT}`,
          deepEqual({
            ...payload,
          }),
        ),
      ).once();
    });

    it("should emit push event for TRANSFER_RECEIVED_EVENT", async () => {
      when(eventEmitter.emitAsync(anyString(), anything())).thenResolve();
      when(mockEventRepo.getEventByName(NotificationEventType.SEND_TRANSFER_RECEIVED_EVENT)).thenResolve({
        id: "fake-id",
        name: NotificationEventType.SEND_TRANSFER_RECEIVED_EVENT,
        handlers: [EventHandlers.PUSH],
        createdTimestamp: new Date(),
        updatedTimestamp: new Date(),
        templates: [],
      });

      const payload: NotificationPayload = getNotificationPayload(NotificationEventType.SEND_TRANSFER_RECEIVED_EVENT);

      await notificationService.sendNotification(NotificationEventType.SEND_TRANSFER_RECEIVED_EVENT, payload);

      verify(
        eventEmitter.emitAsync(
          `push.${NotificationEventType.SEND_TRANSFER_RECEIVED_EVENT}`,
          deepEqual({
            ...payload,
          }),
        ),
      ).once();
    });

    it("should emit push event for PAYROLL_DEPOSIT_COMPLETED_EVENT", async () => {
      when(eventEmitter.emitAsync(anyString(), anything())).thenResolve();

      when(mockEventRepo.getEventByName(NotificationEventType.SEND_PAYROLL_DEPOSIT_COMPLETED_EVENT)).thenResolve({
        id: "fake-id",
        name: NotificationEventType.SEND_PAYROLL_DEPOSIT_COMPLETED_EVENT,
        handlers: [EventHandlers.PUSH],
        createdTimestamp: new Date(),
        updatedTimestamp: new Date(),
        templates: [],
      });

      const payload: NotificationPayload = getNotificationPayload(
        NotificationEventType.SEND_PAYROLL_DEPOSIT_COMPLETED_EVENT,
      );

      await notificationService.sendNotification(NotificationEventType.SEND_PAYROLL_DEPOSIT_COMPLETED_EVENT, payload);

      verify(
        eventEmitter.emitAsync(
          `push.${NotificationEventType.SEND_PAYROLL_DEPOSIT_COMPLETED_EVENT}`,
          deepEqual({
            ...payload,
          }),
        ),
      ).once();
    });
  });
});

function getNotificationPayload(event: NotificationEventType): NotificationPayload {
  let data: NotificationPayload;
  switch (event) {
    case NotificationEventType.SEND_KYC_DENIED_EVENT:
      data = {
        email: "fake+user@noba.com",
        locale: "en",
        firstName: "First",
        lastName: "Last",
        nobaUserID: "fake-id-1234",
      } as SendKycDeniedEvent;
      break;
    case NotificationEventType.SEND_KYC_PENDING_OR_FLAGGED_EVENT:
      data = {
        email: "fake+user@noba.com",
        locale: "en",
        firstName: "First",
        lastName: "Last",
        nobaUserID: "fake-id-1234",
      } as SendKycPendingOrFlaggedEvent;
      break;
    case NotificationEventType.SEND_DOCUMENT_VERIFICATION_PENDING_EVENT:
      data = {
        email: "fake+user@noba.com",
        locale: "en",
        firstName: "First",
        lastName: "Last",
        nobaUserID: "fake-id-1234",
      } as SendDocumentVerificationPendingEvent;
      break;
    case NotificationEventType.SEND_DOCUMENT_VERIFICATION_REJECTED_EVENT:
      data = {
        email: "fake+user@noba.com",
        locale: "en",
        firstName: "First",
        lastName: "Last",
        nobaUserID: "fake-id-1234",
      } as SendDocumentVerificationRejectedEvent;
      break;
    case NotificationEventType.SEND_DOCUMENT_VERIFICATION_TECHNICAL_FAILURE_EVENT:
      data = {
        email: "fake+user@noba.com",
        locale: "en",
        firstName: "First",
        lastName: "Last",
        nobaUserID: "fake-id-1234",
      } as SendDocumentVerificationTechnicalFailureEvent;
      break;
    case NotificationEventType.SEND_DEPOSIT_COMPLETED_EVENT:
      data = {
        email: "fake+email@noba.com",
        firstName: "Fake",
        handle: "fake-1234",
        locale: "en",
        nobaUserID: "fake-id-1234",
        params: {
          transactionRef: "transaction-123",
          createdTimestamp: "2020-01-01T00:00:00.000Z",
          processingFees: 0.1,
          nobaFees: 0.1,
          debitAmount: 5000,
          creditAmount: 1,
          debitCurrency: "COP",
          creditCurrency: "USD",
          totalFees: 0.2,
          exchangeRate: 0.0025,
        },
      } as SendDepositCompletedEvent;
      break;
    case NotificationEventType.SEND_DEPOSIT_INITIATED_EVENT:
      data = {
        email: "fake+email@noba.com",
        firstName: "Fake",
        handle: "fake-1234",
        locale: "en",
        params: {
          transactionRef: "transaction-123",
          createdTimestamp: "2020-01-01T00:00:00.000Z",
          processingFees: 0.1,
          nobaFees: 0.1,
          debitAmount: 5000,
          creditAmount: 1,
          debitCurrency: "COP",
          creditCurrency: "USD",
          totalFees: 0.2,
          exchangeRate: 0.0025,
        },
        nobaUserID: "fake-id-1234",
      } as SendDepositInitiatedEvent;
      break;
    case NotificationEventType.SEND_DEPOSIT_FAILED_EVENT:
      data = {
        email: "fake+email@noba.com",
        firstName: "Fake",
        handle: "fake-1234",
        locale: "en",
        params: {
          transactionRef: "transaction-123",
          createdTimestamp: "2020-01-01T00:00:00.000Z",
          processingFees: 0.1,
          nobaFees: 0.1,
          debitAmount: 5000,
          creditAmount: 1,
          debitCurrency: "COP",
          creditCurrency: "USD",
          totalFees: 0.2,
          exchangeRate: 0.0025,
          reasonDeclined: "reason",
        },
        nobaUserID: "fake-id-1234",
      } as SendDepositFailedEvent;
      break;

    case NotificationEventType.SEND_WITHDRAWAL_COMPLETED_EVENT:
      data = {
        email: "fake+email@noba.com",
        firstName: "Fake",
        handle: "fake-1234",
        locale: "en",
        params: {
          transactionRef: "transaction-123",
          createdTimestamp: "2020-01-01T00:00:00.000Z",
          processingFees: 0.1,
          nobaFees: 0.1,
          debitAmount: 5000,
          creditAmount: 1,
          debitCurrency: "COP",
          creditCurrency: "USD",
          totalFees: 0.2,
          exchangeRate: 0.0025,
        },
        nobaUserID: "fake-id-1234",
      } as SendWithdrawalCompletedEvent;
      break;

    case NotificationEventType.SEND_WITHDRAWAL_INITIATED_EVENT:
      data = {
        email: "fake+email@noba.com",
        firstName: "Fake",
        handle: "fake-1234",
        locale: "en",
        params: {
          transactionRef: "transaction-123",
          createdTimestamp: "2020-01-01T00:00:00.000Z",
          processingFees: 0.1,
          nobaFees: 0.1,
          debitAmount: 5000,
          creditAmount: 1,
          debitCurrency: "COP",
          creditCurrency: "USD",
          totalFees: 0.2,
          exchangeRate: 0.0025,
        },
        nobaUserID: "fake-id-1234",
      } as SendWithdrawalInitiatedEvent;
      break;

    case NotificationEventType.SEND_WITHDRAWAL_FAILED_EVENT:
      data = {
        email: "fake+email@noba.com",
        firstName: "Fake",
        handle: "fake-1234",
        locale: "en",
        params: {
          transactionRef: "transaction-123",
          createdTimestamp: "2020-01-01T00:00:00.000Z",
          processingFees: 0.1,
          nobaFees: 0.1,
          debitAmount: 5000,
          creditAmount: 1,
          debitCurrency: "COP",
          creditCurrency: "USD",
          totalFees: 0.2,
          exchangeRate: 0.0025,
          reasonDeclined: "reason",
        },
        nobaUserID: "fake-id-1234",
      } as SendWithdrawalFailedEvent;
      break;

    case NotificationEventType.SEND_TRANSFER_COMPLETED_EVENT:
      data = {
        email: "fake+email@noba.com",
        firstName: "Fake",
        handle: "fake-1234",
        locale: "en",
        nobaUserID: "fake-id-1234",
        params: {
          transactionRef: "transaction-123",
          createdTimestamp: "2020-01-01T00:00:00.000Z",
          processingFees: 0.1,
          nobaFees: 0.1,
          debitAmount: 5000,
          creditAmount: 1,
          debitCurrency: "COP",
          creditCurrency: "USD",
          totalFees: 0.2,
          exchangeRate: 0.0025,
          creditConsumer_firstName: "Credit",
          creditConsumer_lastName: "Consumer",
          debitConsumer_handle: "debit-1234",
          creditConsumer_handle: "credit-1234",
        },
      } as SendTransferCompletedEvent;
      break;
    case NotificationEventType.SEND_TRANSFER_RECEIVED_EVENT:
      data = {
        email: "fake+email@noba.com",
        firstName: "Fake",
        handle: "fake-1234",
        locale: "en",
        params: {
          transactionRef: "transaction-123",
          createdTimestamp: "2020-01-01T00:00:00.000Z",
          processingFees: 0.1,
          nobaFees: 0.1,
          debitAmount: 5000,
          creditAmount: 1,
          debitCurrency: "COP",
          creditCurrency: "USD",
          totalFees: 0.2,
          exchangeRate: 0.0025,
          creditConsumer_firstName: "Credit",
          creditConsumer_lastName: "Consumer",
          debitConsumer_handle: "debit-1234",
          creditConsumer_handle: "credit-1234",
          debitConsumer_firstName: "Debit",
          debitConsumer_lastName: "Consumer",
        },
        nobaUserID: "fake-id-1234",
      } as SendTransferReceivedEvent;
      break;
    case NotificationEventType.SEND_TRANSFER_FAILED_EVENT:
      data = {
        email: "fake+email@noba.com",
        firstName: "Fake",
        handle: "fake-1234",
        locale: "en",
        params: {
          transactionRef: "transaction-123",
          createdTimestamp: "2020-01-01T00:00:00.000Z",
          processingFees: 0.1,
          nobaFees: 0.1,
          debitAmount: 5000,
          creditAmount: 1,
          debitCurrency: "COP",
          creditCurrency: "USD",
          totalFees: 0.2,
          exchangeRate: 0.0025,
          creditConsumer_firstName: "Credit",
          creditConsumer_lastName: "Consumer",
          debitConsumer_handle: "debit-1234",
          creditConsumer_handle: "credit-1234",
          reasonDeclined: "reason",
        },
        nobaUserID: "fake-id-1234",
      } as SendTransferFailedEvent;
      break;
    case NotificationEventType.SEND_PAYROLL_DEPOSIT_COMPLETED_EVENT:
      data = {
        email: "fake+email@noba.com",
        firstName: "Fake",
        handle: "fake-1234",
        params: {
          transactionRef: "transaction-123",
          createdTimestamp: "2020-01-01T00:00:00.000Z",
          processingFees: 0.1,
          nobaFees: 0.1,
          debitAmount: 5000,
          creditAmount: 1,
          debitCurrency: "COP",
          creditCurrency: "USD",
          totalFees: 0.2,
          exchangeRate: 0.0025,
          companyName: "Fake Company",
        },
        locale: "en",
        nobaUserID: "fake-id-1234",
      } as SendPayrollDepositCompletedEvent;
      break;
    case NotificationEventType.SEND_INVITE_EMPLOYEE_EVENT:
      return {
        email: "fake+employee@noba.com",
        employeeID: "fake-employee-id",
        companyName: "Fake Company",
        inviteUrl: "https://fake-invite.noba.com",
      } as SendInviteEmployeeEvent;
      break;
  }

  return data;
}
