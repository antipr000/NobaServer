import { TestingModule, Test } from "@nestjs/testing";
import { getTestWinstonModule } from "../../../core/utils/WinstonModule";
import { TestConfigModule } from "../../../core/utils/AppConfigModule";
import { anything, capture, instance, when } from "ts-mockito";
import {
  QR_CODES_BASE_URL,
  QR_CODES_FOLDER_BUCKET_PATH,
  SENDGRID_API_KEY,
  SENDGRID_CONFIG_KEY,
} from "../../../config/ConfigurationUtils";
import { SendOtpEvent } from "../events/SendOtpEvent";
import { SendWalletUpdateVerificationCodeEvent } from "../events/SendWalletUpdateVerificationCodeEvent";
import { SendWelcomeMessageEvent } from "../events/SendWelcomeMessageEvent";
import { SendKycApprovedUSEvent } from "../events/SendKycApprovedUSEvent";
import { SendKycApprovedNonUSEvent } from "../events/SendKycApprovedNonUSEvent";
import { SendKycDeniedEvent } from "../events/SendKycDeniedEvent";
import { SendDocumentVerificationPendingEvent } from "../events/SendDocumentVerificationPendingEvent";
import { SendDocumentVerificationRejectedEvent } from "../events/SendDocumentVerificationRejectedEvent";
import { SendDocumentVerificationTechnicalFailureEvent } from "../events/SendDocumentVerificationTechnicalFailureEvent";
import { CurrencyService } from "../../common/currency.service";
import { getMockCurrencyServiceWithDefaults } from "../../common/mocks/mock.currency.service";
import { Utils } from "../../../core/utils/Utils";
import { EmailClient } from "../emails/email.client";
import { EmailEventHandler } from "../email.event.handler";
import { getMockEmailClientWithDefaults } from "../mocks/mock.email.client";
import { SendDepositCompletedEvent } from "../events/SendDepositCompletedEvent";
import { SendDepositFailedEvent } from "../events/SendDepositFailedEvent";
import { SendDepositInitiatedEvent } from "../events/SendDepositInitiatedEvent";
import { SendWithdrawalCompletedEvent } from "../events/SendWithdrawalCompletedEvent";
import { SendWithdrawalInitiatedEvent } from "../events/SendWithdrawalInitiatedEvent";
import { TransactionParameters } from "../domain/TransactionNotificationParameters";
import { SendWithdrawalFailedEvent } from "../events/SendWithdrawalFailedEvent";
import { SendTransferCompletedEvent } from "../events/SendTransferCompletedEvent";
import { SendEmployerRequestEvent } from "../events/SendEmployerRequestEvent";
import { WorkflowName } from "../../../modules/transaction/domain/Transaction";
import { SendTransferFailedEvent } from "../events/SendTransferFailedEvent";
import { SendTransferReceivedEvent } from "../events/SendTransferReceivedEvent";
import { SendKycPendingOrFlaggedEvent } from "../events/SendKycPendingOrFlaggedEvent";
import { SendPayrollDepositCompletedEvent } from "../events/SendPayrollDepositCompletedEvent";
import { EventRepo } from "../repos/event.repo";
import { getMockEventRepoWithDefaults } from "../mocks/mock.event.repo";
import { NotificationEventType } from "../domain/NotificationTypes";
import { EventHandlers } from "../domain/EventHandlers";
import { S3Service } from "../../../modules/common/s3.service";
import { QRService } from "../../../modules/common/qrcode.service";
import { getMockS3ServiceWithDefaults } from "../../../modules/common/mocks/mock.s3.service";
import { getMockQRServiceWithDefaults } from "../../../modules/common/mocks/mock.qr.service";
import { SendInviteEmployeeEvent } from "../events/SendInviteEmployeeEvent";
import { SendScheduledReminderEvent } from "../events/SendScheduledReminderEvent";
import { SendCreditAdjustmentCompletedEvent } from "../events/SendCreditAdjustmentCompletedEvent";
import { LocaleUtils } from "../../../core/utils/LocaleUtils";

describe("EmailEventHandler test for languages", () => {
  let currencyService: CurrencyService;
  let emailClient: EmailClient;
  let eventHandler: EmailEventHandler;
  let app: TestingModule;
  let mockEventRepo: EventRepo;
  let mockS3Service: S3Service;
  let mockQRService: QRService;

  const SUPPORT_URL = "help.noba.com";
  const SENDER_EMAIL = "Noba <no-reply@noba.com>";
  const NOBA_COMPLIANCE_EMAIL = "Noba Compliance <compliance@noba.com>";

  jest.setTimeout(30000);

  beforeAll(async () => {
    currencyService = getMockCurrencyServiceWithDefaults();
    emailClient = getMockEmailClientWithDefaults();
    mockEventRepo = getMockEventRepoWithDefaults();
    mockS3Service = getMockS3ServiceWithDefaults();
    mockQRService = getMockQRServiceWithDefaults();

    process.env = {
      ...process.env,
      NODE_ENV: "development",
    };

    app = await Test.createTestingModule({
      imports: [
        TestConfigModule.registerAsync({
          [SENDGRID_CONFIG_KEY]: {
            [SENDGRID_API_KEY]: "SG.fake_api_key",
          },
          [QR_CODES_BASE_URL]: "https://qrcodes.noba.com",
          [QR_CODES_FOLDER_BUCKET_PATH]: "lowers/qr_codes",
        }),
        getTestWinstonModule(),
      ],
      controllers: [],
      providers: [
        {
          provide: CurrencyService,
          useFactory: () => instance(currencyService),
        },
        {
          provide: "EmailClient",
          useFactory: () => instance(emailClient),
        },
        {
          provide: "EventRepo",
          useFactory: () => instance(mockEventRepo),
        },
        {
          provide: QRService,
          useFactory: () => instance(mockQRService),
        },
        {
          provide: S3Service,
          useFactory: () => instance(mockS3Service),
        },
        EmailEventHandler,
      ],
    }).compile();

    eventHandler = app.get<EmailEventHandler>(EmailEventHandler);
    when(emailClient.sendEmail(anything())).thenResolve();

    jest.useFakeTimers();
    jest.setSystemTime(new Date(2020, 3, 1));
  });

  afterAll(async () => {
    jest.useRealTimers();
    await app.close();
  });

  afterEach(() => {
    jest.resetAllMocks();
  });

  describe.each([
    ["en", "en"],
    ["es_co", "es"],
    ["fake-locale", "en"],
  ])("SendOtpEvent", (locale, templateLocale) => {
    it(`should call emailService with SendOtp event and locale ${locale} resolves to ${templateLocale} template`, async () => {
      const payload: SendOtpEvent = {
        email: "fake+user@noba.com",
        phone: undefined,
        locale: locale,
        otp: "123456",
        firstName: "Fake",
        handle: "fake-handle",
      };

      when(mockEventRepo.getEventByIDOrName(NotificationEventType.SEND_OTP_EVENT)).thenResolve({
        id: "fake-id",
        name: NotificationEventType.SEND_OTP_EVENT,
        handlers: [EventHandlers.EMAIL],
        createdTimestamp: new Date(),
        updatedTimestamp: new Date(),
        templates: [
          {
            id: "fake-template-id-1",
            locale: "en",
            externalKey: "en-template",
            createdTimestamp: new Date(),
            updatedTimestamp: new Date(),
            eventID: "fake-id",
            type: EventHandlers.EMAIL,
          },
          {
            id: "fake-template-id-2",
            locale: "es",
            externalKey: "es-template",
            createdTimestamp: new Date(),
            updatedTimestamp: new Date(),
            eventID: "fake-id",
            type: EventHandlers.EMAIL,
          },
        ],
      });

      await eventHandler.sendOtp(payload);

      const [emailRequest] = capture(emailClient.sendEmail).last();
      expect(emailRequest).toStrictEqual({
        to: payload.email,
        from: SENDER_EMAIL,
        templateId: `${templateLocale}-template`,
        dynamicTemplateData: {
          firstName: payload.firstName ?? "",
          one_time_password: payload.otp,
        },
      });
    });
  });

  it("should call eventHandler with SendWalletUpdateVerificationCode event", async () => {
    const payload: SendWalletUpdateVerificationCodeEvent = {
      email: "fake+user@noba.com",
      phone: undefined,
      locale: "en",
      otp: "123456",
      firstName: "Fake",

      walletAddress: "fake-wallet",

      nobaUserID: "fake-noba-user-id",
    };

    when(
      mockEventRepo.getEventByIDOrName(NotificationEventType.SEND_WALLET_UPDATE_VERIFICATION_CODE_EVENT),
    ).thenResolve({
      id: "fake-id",
      name: NotificationEventType.SEND_WALLET_UPDATE_VERIFICATION_CODE_EVENT,
      handlers: [EventHandlers.EMAIL],
      createdTimestamp: new Date(),
      updatedTimestamp: new Date(),
      templates: [
        {
          id: "fake-template-id-1",
          locale: "en",
          externalKey: "en-template",
          createdTimestamp: new Date(),
          updatedTimestamp: new Date(),
          eventID: "fake-id",
          type: EventHandlers.EMAIL,
        },
        {
          id: "fake-template-id-2",
          locale: "es",
          externalKey: "es-template",
          createdTimestamp: new Date(),
          updatedTimestamp: new Date(),
          eventID: "fake-id",
          type: EventHandlers.EMAIL,
        },
      ],
    });

    await eventHandler.sendWalletUpdateVerificationCode(payload);

    const [emailRequest] = capture(emailClient.sendEmail).last();
    expect(emailRequest).toStrictEqual({
      to: payload.email,
      from: SENDER_EMAIL,
      templateId: "en-template",
      dynamicTemplateData: {
        user: payload.firstName ?? "",
        user_email: payload.email,
        one_time_password: payload.otp,
        wallet_address: payload.walletAddress,
      },
    });
  });

  describe.each([
    ["en", "en"],
    ["es_co", "es"],
    ["fake-locale", "en"],
  ])("SendWelcomeMessageEvent", (locale, templateLocale) => {
    it(`should send welcome message email where locale ${locale} resolves to ${templateLocale} template`, async () => {
      const payload: SendWelcomeMessageEvent = {
        email: "fake+user@noba.com",
        firstName: "Fake",
        lastName: "Name",
        locale: locale,
        nobaUserID: "fake-noba-user-id",
      };

      when(mockEventRepo.getEventByIDOrName(NotificationEventType.SEND_WELCOME_MESSAGE_EVENT)).thenResolve({
        id: "fake-id",
        name: NotificationEventType.SEND_WELCOME_MESSAGE_EVENT,
        handlers: [EventHandlers.EMAIL],
        createdTimestamp: new Date(),
        updatedTimestamp: new Date(),
        templates: [
          {
            id: "fake-template-id-1",
            locale: "en",
            externalKey: "en-template",
            createdTimestamp: new Date(),
            updatedTimestamp: new Date(),
            eventID: "fake-id",
            type: EventHandlers.EMAIL,
          },
          {
            id: "fake-template-id-2",
            locale: "es",
            externalKey: "es-template",
            createdTimestamp: new Date(),
            updatedTimestamp: new Date(),
            eventID: "fake-id",
            type: EventHandlers.EMAIL,
          },
        ],
      });

      await eventHandler.sendWelcomeMessage(payload);

      const [emailRequest] = capture(emailClient.sendEmail).last();
      expect(emailRequest).toStrictEqual({
        to: payload.email,
        from: SENDER_EMAIL,
        templateId: `${templateLocale}-template`,
        dynamicTemplateData: {},
      });
    });
  });

  describe.each([
    ["en", "en"],
    ["es_co", "es"],
    ["fake-locale", "en"],
  ])("SendKycApprovedUSEvent", (locale, templateLocale) => {
    it(`should send Kyc Approved Email where locale ${locale} resolves to ${templateLocale} template`, async () => {
      const payload: SendKycApprovedUSEvent = {
        email: "fake+user@noba.com",
        firstName: "Fake",
        lastName: "Name",
        locale: locale,
        nobaUserID: "fake-noba-user-id",
      };

      when(mockEventRepo.getEventByIDOrName(NotificationEventType.SEND_KYC_APPROVED_US_EVENT)).thenResolve({
        id: "fake-id",
        name: NotificationEventType.SEND_KYC_APPROVED_US_EVENT,
        handlers: [EventHandlers.EMAIL],
        createdTimestamp: new Date(),
        updatedTimestamp: new Date(),
        templates: [
          {
            id: "fake-template-id-1",
            locale: "en",
            externalKey: "en-template",
            createdTimestamp: new Date(),
            updatedTimestamp: new Date(),
            eventID: "fake-id",
            type: EventHandlers.EMAIL,
          },
          {
            id: "fake-template-id-2",
            locale: "es",
            externalKey: "es-template",
            createdTimestamp: new Date(),
            updatedTimestamp: new Date(),
            eventID: "fake-id",
            type: EventHandlers.EMAIL,
          },
        ],
      });

      await eventHandler.sendKycApprovedUSEmail(payload);

      const [emailRequest] = capture(emailClient.sendEmail).last();
      expect(emailRequest).toStrictEqual({
        to: payload.email,
        from: SENDER_EMAIL,
        templateId: `${templateLocale}-template`,
        dynamicTemplateData: {
          firstName: payload.firstName,
        },
      });
    });
  });

  it("should call eventHandler with SendKycApprovedNonUS event", async () => {
    const payload: SendKycApprovedNonUSEvent = {
      email: "fake+user@noba.com",
      firstName: "Fake",
      lastName: "Name",
      locale: "en",
      nobaUserID: "fake-noba-user-id",
    };

    when(mockEventRepo.getEventByIDOrName(NotificationEventType.SEND_KYC_APPROVED_NON_US_EVENT)).thenResolve({
      id: "fake-id",
      name: NotificationEventType.SEND_KYC_APPROVED_NON_US_EVENT,
      handlers: [EventHandlers.EMAIL],
      createdTimestamp: new Date(),
      updatedTimestamp: new Date(),
      templates: [
        {
          id: "fake-template-id-1",
          locale: "en",
          externalKey: "en-template",
          createdTimestamp: new Date(),
          updatedTimestamp: new Date(),
          eventID: "fake-id",
          type: EventHandlers.EMAIL,
        },
        {
          id: "fake-template-id-2",
          locale: "es",
          externalKey: "es-template",
          createdTimestamp: new Date(),
          updatedTimestamp: new Date(),
          eventID: "fake-id",
          type: EventHandlers.EMAIL,
        },
      ],
    });

    await eventHandler.sendKycApprovedNonUSEmail(payload);

    const [emailRequest] = capture(emailClient.sendEmail).last();
    expect(emailRequest).toStrictEqual({
      to: payload.email,
      from: SENDER_EMAIL,
      templateId: "en-template",
      dynamicTemplateData: {
        user_email: payload.email,
        username: Utils.getUsernameFromNameParts(payload.firstName, payload.lastName),
      },
    });
  });

  describe.each([
    ["en", "en"],
    ["es_co", "es"],
    ["fake-locale", "en"],
  ])("SendKycDeniedEvent", (locale, templateLocale) => {
    it(`should send Kyc Denied email where locale ${locale} resolves to ${templateLocale} template`, async () => {
      const payload: SendKycDeniedEvent = {
        email: "fake+user@noba.com",
        firstName: "Fake",
        lastName: "Name",
        locale: locale,
        nobaUserID: "fake-noba-user-id",
      };

      when(mockEventRepo.getEventByIDOrName(NotificationEventType.SEND_KYC_DENIED_EVENT)).thenResolve({
        id: "fake-id",
        name: NotificationEventType.SEND_KYC_DENIED_EVENT,
        handlers: [EventHandlers.EMAIL],
        createdTimestamp: new Date(),
        updatedTimestamp: new Date(),
        templates: [
          {
            id: "fake-template-id-1",
            locale: "en",
            externalKey: "en-template",
            createdTimestamp: new Date(),
            updatedTimestamp: new Date(),
            eventID: "fake-id",
            type: EventHandlers.EMAIL,
          },
          {
            id: "fake-template-id-2",
            locale: "es",
            externalKey: "es-template",
            createdTimestamp: new Date(),
            updatedTimestamp: new Date(),
            eventID: "fake-id",
            type: EventHandlers.EMAIL,
          },
        ],
      });

      await eventHandler.sendKycDeniedEmail(payload);

      const [emailRequest] = capture(emailClient.sendEmail).last();
      expect(emailRequest).toStrictEqual({
        to: payload.email,
        from: SENDER_EMAIL,
        templateId: `${templateLocale}-template`,
        dynamicTemplateData: {
          firstName: payload.firstName,
        },
      });
    });
  });

  describe.each([
    ["en", "en"],
    ["es_co", "es"],
    ["fake-locale", "en"],
  ])("SendKycPendingOrFlaggedEvent", (locale, templateLocale) => {
    it(`should send Kyc Pending Or Flagged email where locale ${locale} resolves to ${templateLocale} template`, async () => {
      const payload: SendKycPendingOrFlaggedEvent = {
        email: "fake+user@noba.com",
        firstName: "Fake",
        lastName: "Name",
        locale: locale,
        nobaUserID: "fake-noba-user-id",
      };

      when(mockEventRepo.getEventByIDOrName(NotificationEventType.SEND_KYC_PENDING_OR_FLAGGED_EVENT)).thenResolve({
        id: "fake-id",
        name: NotificationEventType.SEND_KYC_PENDING_OR_FLAGGED_EVENT,
        handlers: [EventHandlers.EMAIL],
        createdTimestamp: new Date(),
        updatedTimestamp: new Date(),
        templates: [
          {
            id: "fake-template-id-1",
            locale: "en",
            externalKey: "en-template",
            createdTimestamp: new Date(),
            updatedTimestamp: new Date(),
            eventID: "fake-id",
            type: EventHandlers.EMAIL,
          },
          {
            id: "fake-template-id-2",
            locale: "es",
            externalKey: "es-template",
            createdTimestamp: new Date(),
            updatedTimestamp: new Date(),
            eventID: "fake-id",
            type: EventHandlers.EMAIL,
          },
        ],
      });

      await eventHandler.sendKycPendingOrFlaggedEmail(payload);

      const [emailRequest] = capture(emailClient.sendEmail).last();
      expect(emailRequest).toStrictEqual({
        to: payload.email,
        from: SENDER_EMAIL,
        templateId: `${templateLocale}-template`,
        dynamicTemplateData: {
          firstName: payload.firstName,
        },
      });
    });
  });

  describe.each([
    ["en", "en"],
    ["es_co", "es"],
    ["fake-locale", "en"],
  ])("SendDocVerificationPending", (locale, templateLocale) => {
    it(`should send Document Verification Pending email where locale ${locale} resolves to ${templateLocale} template`, async () => {
      const payload: SendDocumentVerificationPendingEvent = {
        email: "fake+user@noba.com",
        firstName: "Fake",
        lastName: "Name",
        locale: locale,
        nobaUserID: "fake-noba-user-id",
      };

      when(
        mockEventRepo.getEventByIDOrName(NotificationEventType.SEND_DOCUMENT_VERIFICATION_PENDING_EVENT),
      ).thenResolve({
        id: "fake-id",
        name: NotificationEventType.SEND_DOCUMENT_VERIFICATION_PENDING_EVENT,
        handlers: [EventHandlers.EMAIL],
        createdTimestamp: new Date(),
        updatedTimestamp: new Date(),
        templates: [
          {
            id: "fake-template-id-1",
            locale: "en",
            externalKey: "en-template",
            createdTimestamp: new Date(),
            updatedTimestamp: new Date(),
            eventID: "fake-id",
            type: EventHandlers.EMAIL,
          },
          {
            id: "fake-template-id-2",
            locale: "es",
            externalKey: "es-template",
            createdTimestamp: new Date(),
            updatedTimestamp: new Date(),
            eventID: "fake-id",
            type: EventHandlers.EMAIL,
          },
        ],
      });

      await eventHandler.sendDocVerificationPendingEmail(payload);

      const [emailRequest] = capture(emailClient.sendEmail).last();
      expect(emailRequest).toStrictEqual({
        to: payload.email,
        from: SENDER_EMAIL,
        templateId: `${templateLocale}-template`,
        dynamicTemplateData: {
          firstName: payload.firstName,
        },
      });
    });
  });

  describe.each([
    ["en", "en"],
    ["es", "en"],
    ["fake-locale", "en"],
  ])("SendDocVerificationRejected", (locale, templateLocale) => {
    it(`should send Document Verification Rejected email where locale ${locale} resolves to ${templateLocale} template`, async () => {
      const payload: SendDocumentVerificationRejectedEvent = {
        email: "fake+user@noba.com",
        firstName: "Fake",
        lastName: "Name",
        locale: locale,
        nobaUserID: "fake-noba-user-id",
      };

      when(
        mockEventRepo.getEventByIDOrName(NotificationEventType.SEND_DOCUMENT_VERIFICATION_REJECTED_EVENT),
      ).thenResolve({
        id: "fake-id",
        name: NotificationEventType.SEND_DOCUMENT_VERIFICATION_REJECTED_EVENT,
        handlers: [EventHandlers.EMAIL],
        createdTimestamp: new Date(),
        updatedTimestamp: new Date(),
        templates: [
          {
            id: "fake-template-id-1",
            locale: "en",
            externalKey: "en-template",
            createdTimestamp: new Date(),
            updatedTimestamp: new Date(),
            eventID: "fake-id",
            type: EventHandlers.EMAIL,
          },
        ],
      });

      await eventHandler.sendDocVerificationRejectedEmail(payload);

      const [emailRequest] = capture(emailClient.sendEmail).last();
      expect(emailRequest).toStrictEqual({
        to: payload.email,
        from: SENDER_EMAIL,
        templateId: `${templateLocale}-template`,
        dynamicTemplateData: {
          user_email: payload.email,
          username: Utils.getUsernameFromNameParts(payload.firstName, payload.lastName),
        },
      });
    });
  });

  describe.each([
    ["en", "en"],
    ["fake-locale", "en"],
  ])("SendDocVerificationTechnicalFailure", (locale, templateLocale) => {
    it(`should send Document Verification Technical Failure email where locale ${locale} resolves to ${templateLocale} template`, async () => {
      const payload: SendDocumentVerificationTechnicalFailureEvent = {
        email: "fake+user@noba.com",
        firstName: "Fake",
        lastName: "Name",
        locale: locale,
        nobaUserID: "fake-noba-user-id",
      };

      when(
        mockEventRepo.getEventByIDOrName(NotificationEventType.SEND_DOCUMENT_VERIFICATION_TECHNICAL_FAILURE_EVENT),
      ).thenResolve({
        id: "fake-id",
        name: NotificationEventType.SEND_DOCUMENT_VERIFICATION_TECHNICAL_FAILURE_EVENT,
        handlers: [EventHandlers.EMAIL],
        createdTimestamp: new Date(),
        updatedTimestamp: new Date(),
        templates: [
          {
            id: "fake-template-id-1",
            locale: "en",
            externalKey: "en-template",
            createdTimestamp: new Date(),
            updatedTimestamp: new Date(),
            eventID: "fake-id",
            type: EventHandlers.EMAIL,
          },
          {
            id: "fake-template-id-2",
            locale: "es",
            externalKey: "es-template",
            createdTimestamp: new Date(),
            updatedTimestamp: new Date(),
            eventID: "fake-id",
            type: EventHandlers.EMAIL,
          },
        ],
      });

      await eventHandler.sendDocVerificationFailedTechEmail(payload);

      const [emailRequest] = capture(emailClient.sendEmail).last();
      expect(emailRequest).toStrictEqual({
        to: payload.email,
        from: SENDER_EMAIL,
        templateId: `${templateLocale}-template`,
        dynamicTemplateData: {
          user_email: payload.email,
          username: Utils.getUsernameFromNameParts(payload.firstName, payload.lastName),
        },
      });
    });
  });

  describe.each([
    ["en", "en"],
    ["es_co", "es"],
    ["fake-locale", "en"],
  ])("SendDepositCompletedEvent", (locale, templateLocale) => {
    it(`should send Deposit completed email when locale ${locale} resolves to ${templateLocale} template`, async () => {
      const payload: SendDepositCompletedEvent = {
        email: "fake+user@noba.com",
        firstName: "First",
        handle: "fake-handle",
        params: getTransactionParams(WorkflowName.WALLET_DEPOSIT, locale),
        locale: locale,
      };

      when(mockEventRepo.getEventByIDOrName(NotificationEventType.SEND_DEPOSIT_COMPLETED_EVENT)).thenResolve({
        id: "fake-id",
        name: NotificationEventType.SEND_DEPOSIT_COMPLETED_EVENT,
        handlers: [EventHandlers.EMAIL],
        createdTimestamp: new Date(),
        updatedTimestamp: new Date(),
        templates: [
          {
            id: "fake-template-id-1",
            locale: "en",
            externalKey: "en-template",
            createdTimestamp: new Date(),
            updatedTimestamp: new Date(),
            eventID: "fake-id",
            type: EventHandlers.EMAIL,
          },
          {
            id: "fake-template-id-2",
            locale: "es",
            externalKey: "es-template",
            createdTimestamp: new Date(),
            updatedTimestamp: new Date(),
            eventID: "fake-id",
            type: EventHandlers.EMAIL,
          },
        ],
      });

      await eventHandler.sendDepositCompletedEmail(payload);
      const subtotal = LocaleUtils.localizeAmount(
        payload.params.creditAmountNumber + payload.params.totalFeesNumber,
        locale,
      );
      const [emailRequest] = capture(emailClient.sendEmail).last();
      expect(emailRequest).toStrictEqual({
        to: payload.email,
        from: SENDER_EMAIL,
        templateId: `${templateLocale}-template`,
        dynamicTemplateData: {
          firstName: payload.firstName,
          debitAmount: payload.params.debitAmount,
          debitCurrency: "COP",
          creditAmount: payload.params.creditAmount,
          creditCurrency: "USDC",
          handle: payload.handle,
          transactionRef: payload.params.transactionRef,
          createdTimestamp: payload.params.createdTimestamp,
          exchangeRate: payload.params.exchangeRate,
          subtotal: subtotal,
          processingFees: payload.params.processingFees,
          nobaFees: payload.params.nobaFees,
        },
      });
    });
  });

  describe.each([
    ["en", "en"],
    ["es_co", "es"],
    ["fake-locale", "en"],
  ])("SendDepositFailed", (locale, templateLocale) => {
    it(`should send Deposit Failed email where locale ${locale} resolves to ${templateLocale} template`, async () => {
      const payload: SendDepositFailedEvent = {
        email: "fake+user@noba.com",
        firstName: "First",
        handle: "fake-handle",
        params: {
          ...getTransactionParams(WorkflowName.WALLET_DEPOSIT, locale),
          reasonDeclined: "Failed",
        },
        locale: locale,
      };

      when(mockEventRepo.getEventByIDOrName(NotificationEventType.SEND_DEPOSIT_FAILED_EVENT)).thenResolve({
        id: "fake-id",
        name: NotificationEventType.SEND_DEPOSIT_FAILED_EVENT,
        handlers: [EventHandlers.EMAIL],
        createdTimestamp: new Date(),
        updatedTimestamp: new Date(),
        templates: [
          {
            id: "fake-template-id-1",
            locale: "en",
            externalKey: "en-template",
            createdTimestamp: new Date(),
            updatedTimestamp: new Date(),
            eventID: "fake-id",
            type: EventHandlers.EMAIL,
          },
          {
            id: "fake-template-id-2",
            locale: "es",
            externalKey: "es-template",
            createdTimestamp: new Date(),
            updatedTimestamp: new Date(),
            eventID: "fake-id",
            type: EventHandlers.EMAIL,
          },
        ],
      });

      await eventHandler.sendDepositFailedEmail(payload);
      const subtotal = LocaleUtils.localizeAmount(
        payload.params.creditAmountNumber + payload.params.totalFeesNumber,
        payload.locale,
      );

      const [emailRequest] = capture(emailClient.sendEmail).last();
      expect(emailRequest).toStrictEqual({
        to: payload.email,
        from: SENDER_EMAIL,
        templateId: `${templateLocale}-template`,
        dynamicTemplateData: {
          firstName: payload.firstName,
          debitAmount: payload.params.debitAmount,
          debitCurrency: "COP",
          creditAmount: payload.params.creditAmount,
          creditCurrency: "USDC",
          handle: payload.handle,
          transactionRef: payload.params.transactionRef,
          createdTimestamp: payload.params.createdTimestamp,
          exchangeRate: payload.params.exchangeRate,
          subtotal: subtotal,
          processingFees: payload.params.processingFees,
          nobaFees: payload.params.nobaFees,
          reasonDeclined: payload.params.reasonDeclined,
        },
      });
    });
  });

  describe.each([
    ["en", "en"],
    ["es_co", "es"],
    ["fake-locale", "en"],
  ])("SendDepositInitiatedEmail", (locale, templateLocale) => {
    it(`should send Deposit Initiated email where locale ${locale} resolves to ${templateLocale} template`, async () => {
      const payload: SendDepositInitiatedEvent = {
        email: "fake+user@noba.com",
        firstName: "First",
        handle: "fake-handle",
        params: {
          ...getTransactionParams(WorkflowName.WALLET_DEPOSIT, locale),
        },
        locale: locale,
      };

      when(mockEventRepo.getEventByIDOrName(NotificationEventType.SEND_DEPOSIT_INITIATED_EVENT)).thenResolve({
        id: "fake-id",
        name: NotificationEventType.SEND_DEPOSIT_INITIATED_EVENT,
        handlers: [EventHandlers.EMAIL],
        createdTimestamp: new Date(),
        updatedTimestamp: new Date(),
        templates: [
          {
            id: "fake-template-id-1",
            locale: "en",
            externalKey: "en-template",
            createdTimestamp: new Date(),
            updatedTimestamp: new Date(),
            eventID: "fake-id",
            type: EventHandlers.EMAIL,
          },
          {
            id: "fake-template-id-2",
            locale: "es",
            externalKey: "es-template",
            createdTimestamp: new Date(),
            updatedTimestamp: new Date(),
            eventID: "fake-id",
            type: EventHandlers.EMAIL,
          },
        ],
      });

      await eventHandler.sendDepositInitiatedEmail(payload);
      const subtotal = LocaleUtils.localizeAmount(
        payload.params.creditAmountNumber + payload.params.totalFeesNumber,
        payload.locale,
      );

      const [emailRequest] = capture(emailClient.sendEmail).last();
      expect(emailRequest).toStrictEqual({
        to: payload.email,
        from: SENDER_EMAIL,
        templateId: `${templateLocale}-template`,
        dynamicTemplateData: {
          firstName: payload.firstName,
          debitAmount: payload.params.debitAmount,
          debitCurrency: "COP",
          creditAmount: payload.params.creditAmount,
          creditCurrency: "USDC",
          handle: payload.handle,
          transactionRef: payload.params.transactionRef,
          createdTimestamp: payload.params.createdTimestamp,
          exchangeRate: payload.params.exchangeRate,
          subtotal: subtotal,
          processingFees: payload.params.processingFees,
          nobaFees: payload.params.nobaFees,
        },
      });
    });
  });

  describe.each([
    ["en", "en"],
    ["es_co", "es"],
    ["fake-locale", "en"],
  ])("SendWithdrawalCompleted", (locale, templateLocale) => {
    it(`should send Withdrawal Completed email where locale ${locale} resolves to ${templateLocale} template`, async () => {
      const payload: SendWithdrawalCompletedEvent = {
        email: "fake+user@noba.com",
        firstName: "First",
        handle: "fake-handle",
        params: {
          ...getTransactionParams(WorkflowName.WALLET_WITHDRAWAL, locale),
        },
        locale: locale,
      };

      when(mockEventRepo.getEventByIDOrName(NotificationEventType.SEND_WITHDRAWAL_COMPLETED_EVENT)).thenResolve({
        id: "fake-id",
        name: NotificationEventType.SEND_WITHDRAWAL_COMPLETED_EVENT,
        handlers: [EventHandlers.EMAIL],
        createdTimestamp: new Date(),
        updatedTimestamp: new Date(),
        templates: [
          {
            id: "fake-template-id-1",
            locale: "en",
            externalKey: "en-template",
            createdTimestamp: new Date(),
            updatedTimestamp: new Date(),
            eventID: "fake-id",
            type: EventHandlers.EMAIL,
          },
          {
            id: "fake-template-id-2",
            locale: "es",
            externalKey: "es-template",
            createdTimestamp: new Date(),
            updatedTimestamp: new Date(),
            eventID: "fake-id",
            type: EventHandlers.EMAIL,
          },
        ],
      });

      await eventHandler.sendWithdrawalCompletedEmail(payload);
      const subtotal = LocaleUtils.localizeAmount(
        payload.params.debitAmountNumber - payload.params.totalFeesNumber,
        locale,
      );

      const [emailRequest] = capture(emailClient.sendEmail).last();
      expect(emailRequest).toStrictEqual({
        to: payload.email,
        from: SENDER_EMAIL,
        templateId: `${templateLocale}-template`,
        dynamicTemplateData: {
          firstName: payload.firstName,
          debitAmount: payload.params.debitAmount,
          debitCurrency: "USDC",
          creditAmount: payload.params.creditAmount,
          creditCurrency: "COP",
          handle: payload.handle,
          transactionRef: payload.params.transactionRef,
          createdTimestamp: payload.params.createdTimestamp,
          exchangeRate: payload.params.exchangeRate,
          subtotal: subtotal,
          processingFees: payload.params.processingFees,
          nobaFees: payload.params.nobaFees,
        },
      });
    });
  });

  describe.each([
    ["en", "en"],
    ["es_co", "es"],
    ["fake-locale", "en"],
  ])("SendWithdrawalInitiated", (locale, templateLocale) => {
    it(`should send Withdrawal Initiated email where locale ${locale} resolves to ${templateLocale} template`, async () => {
      const payload: SendWithdrawalInitiatedEvent = {
        email: "fake+user@noba.com",
        firstName: "First",
        handle: "fake-handle",
        params: {
          ...getTransactionParams(WorkflowName.WALLET_WITHDRAWAL, locale),
        },
        locale: locale,
      };

      when(mockEventRepo.getEventByIDOrName(NotificationEventType.SEND_WITHDRAWAL_INITIATED_EVENT)).thenResolve({
        id: "fake-id",
        name: NotificationEventType.SEND_WITHDRAWAL_INITIATED_EVENT,
        handlers: [EventHandlers.EMAIL],
        createdTimestamp: new Date(),
        updatedTimestamp: new Date(),
        templates: [
          {
            id: "fake-template-id-1",
            locale: "en",
            externalKey: "en-template",
            createdTimestamp: new Date(),
            updatedTimestamp: new Date(),
            eventID: "fake-id",
            type: EventHandlers.EMAIL,
          },
          {
            id: "fake-template-id-2",
            locale: "es",
            externalKey: "es-template",
            createdTimestamp: new Date(),
            updatedTimestamp: new Date(),
            eventID: "fake-id",
            type: EventHandlers.EMAIL,
          },
        ],
      });

      await eventHandler.sendWithdrawalInitiatedEmail(payload);
      const subtotal = LocaleUtils.localizeAmount(
        payload.params.debitAmountNumber - payload.params.totalFeesNumber,
        locale,
      );

      const [emailRequest] = capture(emailClient.sendEmail).last();
      expect(emailRequest).toStrictEqual({
        to: payload.email,
        from: SENDER_EMAIL,
        templateId: `${templateLocale}-template`,
        dynamicTemplateData: {
          firstName: payload.firstName,
          debitAmount: payload.params.debitAmount,
          debitCurrency: "USDC",
          creditAmount: payload.params.creditAmount,
          creditCurrency: "COP",
          handle: payload.handle,
          transactionRef: payload.params.transactionRef,
          createdTimestamp: payload.params.createdTimestamp,
          exchangeRate: payload.params.exchangeRate,
          subtotal: subtotal,
          processingFees: payload.params.processingFees,
          nobaFees: payload.params.nobaFees,
        },
      });
    });
  });

  describe.each([
    ["en", "en"],
    ["es_co", "es"],
    ["fake-locale", "en"],
  ])("SendWithdrawalFailed", (locale, templateLocale) => {
    it(`should send Withdrawal Failed email where locale ${locale} resolves to ${templateLocale} template`, async () => {
      const payload: SendWithdrawalFailedEvent = {
        email: "fake+user@noba.com",
        firstName: "First",
        handle: "fake-handle",
        params: {
          ...getTransactionParams(WorkflowName.WALLET_WITHDRAWAL, locale),
          reasonDeclined: "Failed",
        },
        locale: locale,
      };

      when(mockEventRepo.getEventByIDOrName(NotificationEventType.SEND_WITHDRAWAL_FAILED_EVENT)).thenResolve({
        id: "fake-id",
        name: NotificationEventType.SEND_WITHDRAWAL_FAILED_EVENT,
        handlers: [EventHandlers.EMAIL, EventHandlers.PUSH],
        createdTimestamp: new Date(),
        updatedTimestamp: new Date(),
        templates: [
          {
            id: "fake-template-id-3",
            locale: "en",
            templateBody: "Sample push notification template",
            createdTimestamp: new Date(),
            updatedTimestamp: new Date(),
            eventID: "fake-id",
            type: EventHandlers.PUSH,
          },
          {
            id: "fake-template-id-1",
            locale: "en",
            externalKey: "en-template",
            createdTimestamp: new Date(),
            updatedTimestamp: new Date(),
            eventID: "fake-id",
            type: EventHandlers.EMAIL,
          },
          {
            id: "fake-template-id-2",
            locale: "es",
            externalKey: "es-template",
            createdTimestamp: new Date(),
            updatedTimestamp: new Date(),
            eventID: "fake-id",
            type: EventHandlers.EMAIL,
          },
        ],
      });

      await eventHandler.sendWithdrawalFailedEmail(payload);
      const subtotal = LocaleUtils.localizeAmount(
        payload.params.debitAmountNumber - payload.params.totalFeesNumber,
        locale,
      );
      const [emailRequest] = capture(emailClient.sendEmail).last();
      expect(emailRequest).toStrictEqual({
        to: payload.email,
        from: SENDER_EMAIL,
        templateId: `${templateLocale}-template`,
        dynamicTemplateData: {
          firstName: payload.firstName,
          debitAmount: payload.params.debitAmount,
          debitCurrency: "USDC",
          creditAmount: payload.params.creditAmount,
          creditCurrency: "COP",
          handle: payload.handle,
          transactionRef: payload.params.transactionRef,
          createdTimestamp: payload.params.createdTimestamp,
          exchangeRate: payload.params.exchangeRate,
          subtotal: subtotal,
          processingFees: payload.params.processingFees,
          nobaFees: payload.params.nobaFees,
          reasonDeclined: payload.params.reasonDeclined,
        },
      });
    });
  });

  describe.each([
    ["en", "en"],
    ["es_co", "es"],
    ["fake-locale", "en"],
  ])("SendTransferCompleted", (locale, templateLocale) => {
    it(`should send Transfer Completed email where locale ${locale} resolves to ${templateLocale} template`, async () => {
      const payload: SendTransferCompletedEvent = {
        email: "fake+user@noba.com",
        firstName: "First",
        handle: "fake-handle",
        params: {
          ...getTransactionParams(WorkflowName.WALLET_TRANSFER, locale),
          creditConsumer_firstName: "Justin",
          creditConsumer_lastName: "Ashworth",
          creditConsumer_handle: "justin",
          debitConsumer_handle: "gal",
        },
        locale: locale,
      };

      when(mockEventRepo.getEventByIDOrName(NotificationEventType.SEND_TRANSFER_COMPLETED_EVENT)).thenResolve({
        id: "fake-id",
        name: NotificationEventType.SEND_TRANSFER_COMPLETED_EVENT,
        handlers: [EventHandlers.EMAIL],
        createdTimestamp: new Date(),
        updatedTimestamp: new Date(),
        templates: [
          {
            id: "fake-template-id-1",
            locale: "en",
            externalKey: "en-template",
            createdTimestamp: new Date(),
            updatedTimestamp: new Date(),
            eventID: "fake-id",
            type: EventHandlers.EMAIL,
          },
          {
            id: "fake-template-id-2",
            locale: "es",
            externalKey: "es-template",
            createdTimestamp: new Date(),
            updatedTimestamp: new Date(),
            eventID: "fake-id",
            type: EventHandlers.EMAIL,
          },
        ],
      });

      await eventHandler.sendTransferCompletedEmail(payload);
      const subtotal = LocaleUtils.localizeAmount(
        payload.params.debitAmountNumber - payload.params.totalFeesNumber,
        locale,
      );

      const [emailRequest] = capture(emailClient.sendEmail).last();
      expect(emailRequest).toStrictEqual({
        to: payload.email,
        from: SENDER_EMAIL,
        templateId: `${templateLocale}-template`,
        dynamicTemplateData: {
          creditConsumer_firstName: payload.params.creditConsumer_firstName,
          creditConsumer_lastName: payload.params.creditConsumer_lastName,
          debitConsumer_handle: payload.params.debitConsumer_handle,
          creditConsumer_handle: payload.params.creditConsumer_handle,
          firstName: payload.firstName,
          debitAmount: payload.params.debitAmount,
          debitCurrency: "USDC",
          creditAmount: payload.params.creditAmount,
          creditCurrency: "USDC",
          subtotal: subtotal,
          transactionRef: payload.params.transactionRef,
          createdTimestamp: payload.params.createdTimestamp,
          processingFees: payload.params.processingFees,
          nobaFees: payload.params.nobaFees,
        },
      });
    });
  });

  describe.each([
    ["en", "en"],
    ["es_co", "es"],
    ["fake-locale", "en"],
  ])("SendTransferReceived", (locale, templateLocale) => {
    it(`should send Transfer Received email where locale ${locale} resolves to ${templateLocale} template`, async () => {
      const payload: SendTransferReceivedEvent = {
        email: "fake+user@noba.com",
        firstName: "First",
        handle: "fake-handle",
        params: {
          ...getTransactionParams(WorkflowName.WALLET_TRANSFER, locale),
          creditConsumer_firstName: "Justin",
          creditConsumer_lastName: "Ashworth",
          creditConsumer_handle: "justin",
          debitConsumer_handle: "gal",
          debitConsumer_firstName: "Gal",
          debitConsumer_lastName: "Ben Chanoch",
        },
        locale: locale,
      };

      when(mockEventRepo.getEventByIDOrName(NotificationEventType.SEND_TRANSFER_RECEIVED_EVENT)).thenResolve({
        id: "fake-id",
        name: NotificationEventType.SEND_TRANSFER_RECEIVED_EVENT,
        handlers: [EventHandlers.EMAIL],
        createdTimestamp: new Date(),
        updatedTimestamp: new Date(),
        templates: [
          {
            id: "fake-template-id-1",
            locale: "es",
            templateBody: "Sample push template in Spanish",
            createdTimestamp: new Date(),
            updatedTimestamp: new Date(),
            eventID: "fake-id",
            type: EventHandlers.PUSH,
          },
          {
            id: "fake-template-id-2",
            locale: "en",
            templateBody: "Sample push template in English",
            createdTimestamp: new Date(),
            updatedTimestamp: new Date(),
            eventID: "fake-id",
            type: EventHandlers.PUSH,
          },
          {
            id: "fake-template-id-3",
            locale: "en",
            externalKey: "en-template",
            createdTimestamp: new Date(),
            updatedTimestamp: new Date(),
            eventID: "fake-id",
            type: EventHandlers.EMAIL,
          },
          {
            id: "fake-template-id-4",
            locale: "es",
            externalKey: "es-template",
            createdTimestamp: new Date(),
            updatedTimestamp: new Date(),
            eventID: "fake-id",
            type: EventHandlers.EMAIL,
          },
        ],
      });

      await eventHandler.sendTransferReceivedEvent(payload);
      const subtotal = LocaleUtils.localizeAmount(
        payload.params.debitAmountNumber - payload.params.totalFeesNumber,
        locale,
      );

      const [emailRequest] = capture(emailClient.sendEmail).last();
      expect(emailRequest).toStrictEqual({
        to: payload.email,
        from: SENDER_EMAIL,
        templateId: `${templateLocale}-template`,
        dynamicTemplateData: {
          creditConsumer_firstName: payload.params.creditConsumer_firstName,
          creditConsumer_lastName: payload.params.creditConsumer_lastName,
          debitConsumer_handle: payload.params.debitConsumer_handle,
          creditConsumer_handle: payload.params.creditConsumer_handle,
          debitConsumer_firstName: payload.params.debitConsumer_firstName,
          debitConsumer_lastName: payload.params.debitConsumer_lastName,
          firstName: payload.firstName,
          debitAmount: payload.params.debitAmount,
          debitCurrency: "USDC",
          creditAmount: payload.params.creditAmount,
          creditCurrency: "USDC",
          subtotal: subtotal,
          transactionRef: payload.params.transactionRef,
          createdTimestamp: payload.params.createdTimestamp,
          processingFees: payload.params.processingFees,
          nobaFees: payload.params.nobaFees,
        },
      });
    });
  });

  describe.each([
    ["en", "en"],
    ["es_co", "es"],
    ["fake-locale", "en"],
  ])("SendTransferFailed", (locale, templateLocale) => {
    it(`should send Transfer Failed email where locale ${locale} resolves to ${templateLocale} template`, async () => {
      const payload: SendTransferFailedEvent = {
        email: "fake+user@noba.com",
        firstName: "First",
        handle: "fake-handle",
        params: {
          ...getTransactionParams(WorkflowName.WALLET_TRANSFER, locale),
          creditConsumer_firstName: "Justin",
          creditConsumer_lastName: "Ashworth",
          creditConsumer_handle: "justin",
          debitConsumer_handle: "gal",
          reasonDeclined: "Failed transfer",
        },
        locale: locale,
      };

      when(mockEventRepo.getEventByIDOrName(NotificationEventType.SEND_TRANSFER_FAILED_EVENT)).thenResolve({
        id: "fake-id",
        name: NotificationEventType.SEND_TRANSFER_FAILED_EVENT,
        handlers: [EventHandlers.EMAIL],
        createdTimestamp: new Date(),
        updatedTimestamp: new Date(),
        templates: [
          {
            id: "fake-template-id-1",
            locale: "en",
            externalKey: "en-template",
            createdTimestamp: new Date(),
            updatedTimestamp: new Date(),
            eventID: "fake-id",
            type: EventHandlers.EMAIL,
          },
          {
            id: "fake-template-id-2",
            locale: "es",
            externalKey: "es-template",
            createdTimestamp: new Date(),
            updatedTimestamp: new Date(),
            eventID: "fake-id",
            type: EventHandlers.EMAIL,
          },
        ],
      });

      await eventHandler.sendTransferFailedEmail(payload);
      const subtotal = LocaleUtils.localizeAmount(
        payload.params.debitAmountNumber - payload.params.totalFeesNumber,
        locale,
      );

      const [emailRequest] = capture(emailClient.sendEmail).last();
      expect(emailRequest).toStrictEqual({
        to: payload.email,
        from: SENDER_EMAIL,
        templateId: `${templateLocale}-template`,
        dynamicTemplateData: {
          creditConsumer_firstName: payload.params.creditConsumer_firstName,
          creditConsumer_lastName: payload.params.creditConsumer_lastName,
          debitConsumer_handle: payload.params.debitConsumer_handle,
          creditConsumer_handle: payload.params.creditConsumer_handle,
          firstName: payload.firstName,
          debitAmount: payload.params.debitAmount,
          debitCurrency: "USDC",
          creditAmount: payload.params.creditAmount,
          creditCurrency: "USDC",
          subtotal: subtotal,
          transactionRef: payload.params.transactionRef,
          createdTimestamp: payload.params.createdTimestamp,
          processingFees: payload.params.processingFees,
          nobaFees: payload.params.nobaFees,
          reasonDeclined: "Failed transfer",
        },
      });
    });
  });

  describe.each([
    ["en", "en"],
    ["es_co", "es"],
    ["fake-locale", "en"],
  ])("SendPayrollDepositCompletedEvent", (locale, templateLocale) => {
    it(`should send Payroll Deposit Completed email where locale ${locale} resolves to ${templateLocale} template`, async () => {
      const payload: SendPayrollDepositCompletedEvent = {
        email: "fake+user@noba.com",
        firstName: "First",
        handle: "fake-handle",
        params: {
          ...getTransactionParams(WorkflowName.PAYROLL_DEPOSIT, locale),
          companyName: "Noba",
        },
        locale: locale,
      };

      when(mockEventRepo.getEventByIDOrName(NotificationEventType.SEND_PAYROLL_DEPOSIT_COMPLETED_EVENT)).thenResolve({
        id: "fake-id",
        name: NotificationEventType.SEND_PAYROLL_DEPOSIT_COMPLETED_EVENT,
        handlers: [EventHandlers.EMAIL],
        createdTimestamp: new Date(),
        updatedTimestamp: new Date(),
        templates: [
          {
            id: "fake-template-id-1",
            locale: "en",
            externalKey: "en-template",
            createdTimestamp: new Date(),
            updatedTimestamp: new Date(),
            eventID: "fake-id",
            type: EventHandlers.EMAIL,
          },
          {
            id: "fake-template-id-2",
            locale: "es",
            externalKey: "es-template",
            createdTimestamp: new Date(),
            updatedTimestamp: new Date(),
            eventID: "fake-id",
            type: EventHandlers.EMAIL,
          },
        ],
      });

      await eventHandler.sendPayrollDepositCompletedEmail(payload);
      const subtotal = LocaleUtils.localizeAmount(
        payload.params.creditAmountNumber + payload.params.totalFeesNumber,
        locale,
      );

      const [emailRequest] = capture(emailClient.sendEmail).last();
      expect(emailRequest).toStrictEqual({
        to: payload.email,
        from: SENDER_EMAIL,
        templateId: `${templateLocale}-template`,
        dynamicTemplateData: {
          firstName: payload.firstName,
          companyName: payload.params.companyName,
          debitAmount: payload.params.debitAmount,
          debitCurrency: "COP",
          creditAmount: payload.params.creditAmount,
          creditCurrency: "USDC",
          handle: payload.handle,
          transactionRef: payload.params.transactionRef,
          executedTimestamp: payload.params.createdTimestamp,
          exchangeRate: payload.params.exchangeRate,
          subtotal: subtotal,
          processingFees: payload.params.processingFees,
          nobaFees: payload.params.nobaFees,
        },
      });
    });
  });

  describe.each([
    ["en", "en"],
    ["es_co", "es"],
    ["fake-locale", "en"],
  ])("SendCreditAdjustmentCompletedEvent", (locale, templateLocale) => {
    it(`should send Credit Adjustment Completed email where locale ${locale} resolves to ${templateLocale} template`, async () => {
      const payload: SendCreditAdjustmentCompletedEvent = {
        email: "fake+user@noba.com",
        firstName: "First",
        handle: "fake-handle",
        params: getTransactionParams(WorkflowName.CREDIT_ADJUSTMENT, locale),
        locale: locale,
      };

      when(mockEventRepo.getEventByIDOrName(NotificationEventType.SEND_CREDIT_ADJUSTMENT_COMPLETED_EVENT)).thenResolve({
        id: "fake-id",
        name: NotificationEventType.SEND_CREDIT_ADJUSTMENT_COMPLETED_EVENT,
        handlers: [EventHandlers.EMAIL],
        createdTimestamp: new Date(),
        updatedTimestamp: new Date(),
        templates: [
          {
            id: "fake-template-id-1",
            locale: "en",
            externalKey: "en-template",
            createdTimestamp: new Date(),
            updatedTimestamp: new Date(),
            eventID: "fake-id",
            type: EventHandlers.EMAIL,
          },
          {
            id: "fake-template-id-2",
            locale: "es",
            externalKey: "es-template",
            createdTimestamp: new Date(),
            updatedTimestamp: new Date(),
            eventID: "fake-id",
            type: EventHandlers.EMAIL,
          },
        ],
      });

      await eventHandler.sendCreditAdjustmentCompletedEmail(payload);

      const [emailRequest] = capture(emailClient.sendEmail).last();
      expect(emailRequest).toStrictEqual({
        to: payload.email,
        from: SENDER_EMAIL,
        templateId: `${templateLocale}-template`,
        dynamicTemplateData: {
          firstName: payload.firstName,
          lastName: payload.lastName,
          creditAmount: payload.params.creditAmount,
          creditCurrency: "USD",
          handle: payload.handle,
          transactionRef: payload.params.transactionRef,
          createdTimestamp: payload.params.createdTimestamp,
        },
      });
    });
  });

  describe.each([["en"], ["es_co"], ["fake-locale"]])("SendEmployerRequest", locale => {
    it(`should send Employer Request email with 'en' template when locale is ${locale}`, async () => {
      const payload: SendEmployerRequestEvent = {
        email: "fake+user@noba.com",
        locale: locale,
        firstName: "First",
        lastName: "Last",
      };

      when(mockEventRepo.getEventByIDOrName(NotificationEventType.SEND_EMPLOYER_REQUEST_EVENT)).thenResolve({
        id: "fake-id",
        name: NotificationEventType.SEND_EMPLOYER_REQUEST_EVENT,
        handlers: [EventHandlers.EMAIL],
        createdTimestamp: new Date(),
        updatedTimestamp: new Date(),
        templates: [
          {
            id: "fake-template-id-1",
            locale: "en",
            externalKey: "en-template",
            createdTimestamp: new Date(),
            updatedTimestamp: new Date(),
            eventID: "fake-id",
            type: EventHandlers.EMAIL,
          },
        ],
      });

      await eventHandler.sendEmployerRequestEmail(payload);

      const [emailRequest] = capture(emailClient.sendEmail).last();
      expect(emailRequest).toStrictEqual({
        to: "kelsi@noba.com",
        from: SENDER_EMAIL,
        templateId: "en-template",
        dynamicTemplateData: {
          firstName: payload.firstName,
          lastName: payload.lastName,
          employerEmail: payload.email,
        },
      });
    });
  });

  describe.each([["es_co", "es"]])("SendEmployerRequest", (locale, expectedLocale) => {
    it(`should send Employee Invite Email with ${expectedLocale} template when locale is ${locale}`, async () => {
      const payload: SendInviteEmployeeEvent = {
        email: "fake+user@noba.com",
        locale: locale,
        employeeID: "fake-employee-id",
        inviteUrl: "https://noba.com",
        companyName: "Fake Company",
      };

      when(mockEventRepo.getEventByIDOrName(NotificationEventType.SEND_INVITE_EMPLOYEE_EVENT)).thenResolve({
        id: "fake-id",
        name: NotificationEventType.SEND_INVITE_EMPLOYEE_EVENT,
        handlers: [EventHandlers.EMAIL],
        createdTimestamp: new Date(),
        updatedTimestamp: new Date(),
        templates: [
          {
            id: "fake-template-id-1",
            locale: "es",
            externalKey: "es-template",
            createdTimestamp: new Date(),
            updatedTimestamp: new Date(),
            eventID: "fake-id",
            type: EventHandlers.EMAIL,
          },
        ],
      });

      when(mockQRService.generateQRCode(payload.inviteUrl)).thenResolve("fake-qr-code");
      when(
        mockS3Service.uploadToS3(
          "lowers/qr_codes",
          `employee_${payload.employeeID}.png`,
          anything(),
          "base64",
          "image/png",
        ),
      ).thenResolve();

      await eventHandler.sendInviteEmployeeEmail(payload);

      const [emailRequest] = capture(emailClient.sendEmail).last();
      expect(emailRequest).toStrictEqual({
        to: payload.email,
        from: SENDER_EMAIL,
        templateId: "es-template",
        dynamicTemplateData: {
          companyName: payload.companyName,
          qrCodeImageUrl: "https://qrcodes.noba.com/lowers/qr_codes/employee_fake-employee-id.png",
        },
      });
    });
  });

  describe.each([
    ["en", "en"],
    ["es_co", "es"],
  ])("sendScheduledReminderEvent", (locale, expectedLocale) => {
    it(`should send Scheduled Reminder Email with ${expectedLocale} template when locale is ${locale}`, async () => {
      const payload: SendScheduledReminderEvent = {
        eventID: "fake-event-id",
        firstName: "First",
        lastName: "Last",
        email: "fake+email@noba.com",
        locale: locale,
      };

      when(mockEventRepo.getEventByIDOrName(payload.eventID)).thenResolve({
        id: "fake-event-id",
        name: "Some Fake Event",
        createdTimestamp: new Date(),
        updatedTimestamp: new Date(),
        handlers: [EventHandlers.EMAIL],
        templates: [
          {
            id: "fake-template-id-1",
            locale: "en",
            externalKey: "en-template",
            createdTimestamp: new Date(),
            updatedTimestamp: new Date(),
            eventID: "fake-event-id",
            type: EventHandlers.EMAIL,
          },
          {
            id: "fake-template-id-2",
            locale: "es",
            externalKey: "es-template",
            createdTimestamp: new Date(),
            updatedTimestamp: new Date(),
            eventID: "fake-event-id",
            type: EventHandlers.EMAIL,
          },
        ],
      });

      when(emailClient.sendEmail(anything())).thenResolve();

      await eventHandler.sendScheduledReminderEvent(payload);

      const [emailRequest] = capture(emailClient.sendEmail).last();
      expect(emailRequest).toStrictEqual({
        to: payload.email,
        from: SENDER_EMAIL,
        templateId: `${expectedLocale}-template`,
        dynamicTemplateData: {
          firstName: payload.firstName,
          lastName: payload.lastName,
          handle: payload.handle,
        },
      });
    });
  });
});

function getTransactionParams(workflow: WorkflowName, locale: string): TransactionParameters {
  switch (workflow) {
    case WorkflowName.WALLET_DEPOSIT:
      return {
        debitAmount: LocaleUtils.localizeAmount(5000, locale),
        debitAmountNumber: 5000,
        debitCurrency: "COP",
        creditAmount: LocaleUtils.localizeAmount(1, locale),
        creditAmountNumber: 1,
        creditCurrency: "USD",
        exchangeRate: LocaleUtils.localizeAmount(0.0025, locale),
        transactionRef: "transaction-1",
        createdTimestamp: "2023-02-02T17:54:37.601Z",
        processingFees: LocaleUtils.localizeAmount(0.23, locale),
        nobaFees: LocaleUtils.localizeAmount(0.34, locale),
        totalFees: LocaleUtils.localizeAmount(0.57, locale),
        totalFeesNumber: 0.57,
      };

    case WorkflowName.WALLET_WITHDRAWAL:
      return {
        debitAmount: LocaleUtils.localizeAmount(1, locale),
        debitAmountNumber: 1,
        debitCurrency: "USD",
        creditAmount: LocaleUtils.localizeAmount(5000, locale),
        creditAmountNumber: 5000,
        creditCurrency: "COP",
        exchangeRate: LocaleUtils.localizeAmount(5000, locale, false),
        transactionRef: "transaction-1",
        createdTimestamp: "2023-02-02T17:54:37.601Z",
        processingFees: LocaleUtils.localizeAmount(0.23, locale),
        nobaFees: LocaleUtils.localizeAmount(0.34, locale),
        totalFees: LocaleUtils.localizeAmount(0.57, locale),
        totalFeesNumber: 0.57,
      };
    case WorkflowName.WALLET_TRANSFER:
      return {
        debitAmount: LocaleUtils.localizeAmount(10, locale),
        debitAmountNumber: 10,
        debitCurrency: "USD",
        creditAmount: LocaleUtils.localizeAmount(9.43, locale),
        creditAmountNumber: 9.43,
        creditCurrency: "USD",
        exchangeRate: LocaleUtils.localizeAmount(0.0025, locale, false),
        transactionRef: "transaction-1",
        createdTimestamp: "2023-02-02T17:54:37.601Z",
        processingFees: LocaleUtils.localizeAmount(0.23, locale),
        nobaFees: LocaleUtils.localizeAmount(0.34, locale),
        totalFees: LocaleUtils.localizeAmount(0.57, locale),
        totalFeesNumber: 0.57,
      };
    case WorkflowName.PAYROLL_DEPOSIT:
      return {
        debitAmount: LocaleUtils.localizeAmount(5000, locale),
        debitAmountNumber: 5000,
        debitCurrency: "COP",
        creditAmount: LocaleUtils.localizeAmount(1, locale),
        creditAmountNumber: 1,
        creditCurrency: "USD",
        exchangeRate: LocaleUtils.localizeAmount(0.0025, locale, false),
        transactionRef: "transaction-1",
        createdTimestamp: "2023-02-02T17:54:37.601Z",
        processingFees: LocaleUtils.localizeAmount(0.23, locale),
        nobaFees: LocaleUtils.localizeAmount(0.34, locale),
        totalFees: LocaleUtils.localizeAmount(0.57, locale),
        totalFeesNumber: 0.57,
      };
    case WorkflowName.CREDIT_ADJUSTMENT:
      return {
        creditAmount: LocaleUtils.localizeAmount(1, "en"),
        creditAmountNumber: 1,
        creditCurrency: "USD",
        debitAmount: null,
        debitAmountNumber: null,
        debitCurrency: null,
        exchangeRate: LocaleUtils.localizeAmount(1, "en"),
        transactionRef: "transaction-1",
        createdTimestamp: "2023-02-02T17:54:37.601Z",
        processingFees: null,
        nobaFees: null,
        totalFees: null,
        totalFeesNumber: null,
      };
  }
}
