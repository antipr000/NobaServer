import { TestingModule, Test } from "@nestjs/testing";
import { getTestWinstonModule } from "../../../core/utils/WinstonModule";
import { TestConfigModule } from "../../../core/utils/AppConfigModule";
import { anything, capture, instance, when } from "ts-mockito";
import { SENDGRID_API_KEY, SENDGRID_CONFIG_KEY } from "../../../config/ConfigurationUtils";
import { SendOtpEvent } from "../events/SendOtpEvent";
import { SendWalletUpdateVerificationCodeEvent } from "../events/SendWalletUpdateVerificationCodeEvent";
import { SendWelcomeMessageEvent } from "../events/SendWelcomeMessageEvent";
import { SendKycApprovedUSEvent } from "../events/SendKycApprovedUSEvent";
import { SendKycApprovedNonUSEvent } from "../events/SendKycApprovedNonUSEvent";
import { SendKycDeniedEvent } from "../events/SendKycDeniedEvent";
import { SendDocumentVerificationPendingEvent } from "../events/SendDocumentVerificationPendingEvent";
import { SendDocumentVerificationRejectedEvent } from "../events/SendDocumentVerificationRejectedEvent";
import { SendDocumentVerificationTechnicalFailureEvent } from "../events/SendDocumentVerificationTechnicalFailureEvent";
import { SendCardAddedEvent } from "../events/SendCardAddedEvent";
import { SendCardAdditionFailedEvent } from "../events/SendCardAdditionFailedEvent";
import { SendCardDeletedEvent } from "../events/SendCardDeletedEvent";
import { SendHardDeclineEvent } from "../events/SendHardDeclineEvent";
import { CurrencyService } from "../../common/currency.service";
import { getMockCurrencyServiceWithDefaults } from "../../common/mocks/mock.currency.service";
import { EmailTemplates } from "../domain/EmailTemplates";
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

describe("EmailEventHandler test for languages", () => {
  let currencyService: CurrencyService;
  let emailClient: EmailClient;
  let eventHandler: EmailEventHandler;
  let app: TestingModule;

  const SUPPORT_URL = "help.noba.com";
  const SENDER_EMAIL = "Noba <no-reply@noba.com>";
  const NOBA_COMPLIANCE_EMAIL = "Noba Compliance <compliance@noba.com>";

  jest.setTimeout(30000);

  beforeAll(async () => {
    currencyService = getMockCurrencyServiceWithDefaults();
    emailClient = getMockEmailClientWithDefaults();

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

  describe("SendOtpEvent", () => {
    it("should call emailService with SendOtp event with 'en' template", async () => {
      const payload = new SendOtpEvent({
        email: "fake+user@noba.com",
        phone: undefined,
        locale: "en",
        otp: "123456",
        name: "Fake",
        handle: "fake-handle",
      });

      await eventHandler.sendOtp(payload);

      const [emailRequest] = capture(emailClient.sendEmail).last();
      expect(emailRequest).toStrictEqual({
        to: payload.email,
        from: SENDER_EMAIL,
        templateId: EmailTemplates.OTP_EMAIL["en"],
        dynamicTemplateData: {
          firstName: payload.name ?? "",
          one_time_password: payload.otp,
        },
      });
    });

    it("should call emailService with SendOtp event with 'es' template when locale is 'es_co'", async () => {
      const payload = new SendOtpEvent({
        email: "fake+user@noba.com",
        phone: undefined,
        locale: "es_co",
        otp: "123456",
        name: "Fake",
        handle: "fake-handle",
      });

      await eventHandler.sendOtp(payload);

      const [emailRequest] = capture(emailClient.sendEmail).last();
      expect(emailRequest).toStrictEqual({
        to: payload.email,
        from: SENDER_EMAIL,
        templateId: EmailTemplates.OTP_EMAIL["es"],
        dynamicTemplateData: {
          firstName: payload.name ?? "",
          one_time_password: payload.otp,
        },
      });
    });

    it("should fallback to en when locale is not found", async () => {
      const payload = new SendOtpEvent({
        email: "fake+user@noba.com",
        phone: undefined,
        locale: "fake-locale",
        otp: "123456",
        name: "Fake",
        handle: "fake-handle",
      });

      await eventHandler.sendOtp(payload);

      const [emailRequest] = capture(emailClient.sendEmail).last();
      expect(emailRequest).toStrictEqual({
        to: payload.email,
        from: SENDER_EMAIL,
        templateId: EmailTemplates.OTP_EMAIL["en"],
        dynamicTemplateData: {
          firstName: payload.name ?? "",
          one_time_password: payload.otp,
        },
      });
    });
  });

  it("should call eventHandler with SendWalletUpdateVerificationCode event", async () => {
    const payload = new SendWalletUpdateVerificationCodeEvent({
      email: "fake+user@noba.com",
      phone: undefined,
      locale: "en",
      otp: "123456",
      name: "Fake",

      walletAddress: "fake-wallet",

      nobaUserID: "fake-noba-user-id",
    });

    await eventHandler.sendWalletUpdateVerificationCode(payload);

    const [emailRequest] = capture(emailClient.sendEmail).last();
    expect(emailRequest).toStrictEqual({
      to: payload.email,
      from: SENDER_EMAIL,
      templateId: EmailTemplates.WALLET_UPDATE_OTP["en"],
      dynamicTemplateData: {
        user: payload.name ?? "",
        user_email: payload.email,
        one_time_password: payload.otp,
        wallet_address: payload.walletAddress,
      },
    });
  });

  describe("SendWelcomeMessageEvent", () => {
    it("should call eventHandler with SendWelcomeMessage event with 'en' template", async () => {
      const payload = new SendWelcomeMessageEvent({
        email: "fake+user@noba.com",
        firstName: "Fake",
        lastName: "Name",
        locale: "en",
        nobaUserID: "fake-noba-user-id",
      });

      await eventHandler.sendWelcomeMessage(payload);

      const [emailRequest] = capture(emailClient.sendEmail).last();
      expect(emailRequest).toStrictEqual({
        to: payload.email,
        from: SENDER_EMAIL,
        templateId: EmailTemplates.WELCOME_EMAIL["en"],
        dynamicTemplateData: {},
      });
    });

    it("should call eventHandler with SendWelcomeMessage event with 'es' template", async () => {
      const payload = new SendWelcomeMessageEvent({
        email: "fake+user@noba.com",
        firstName: "Fake",
        lastName: "Name",
        locale: "es_co",
        nobaUserID: "fake-noba-user-id",
      });

      await eventHandler.sendWelcomeMessage(payload);

      const [emailRequest] = capture(emailClient.sendEmail).last();
      expect(emailRequest).toStrictEqual({
        to: payload.email,
        from: SENDER_EMAIL,
        templateId: EmailTemplates.WELCOME_EMAIL["es"],
        dynamicTemplateData: {},
      });
    });

    it("should fallback to en when locale is not found", async () => {
      const payload = new SendWelcomeMessageEvent({
        email: "fake+user@noba.com",
        firstName: "Fake",
        lastName: "Name",
        locale: "fake-locale",
        nobaUserID: "fake-noba-user-id",
      });

      await eventHandler.sendWelcomeMessage(payload);

      const [emailRequest] = capture(emailClient.sendEmail).last();
      expect(emailRequest).toStrictEqual({
        to: payload.email,
        from: SENDER_EMAIL,
        templateId: EmailTemplates.WELCOME_EMAIL["en"],
        dynamicTemplateData: {},
      });
    });
  });

  describe("SendKycApprovedUSEvent", () => {
    it("should call eventHandler with SendKycApprovedUS event with 'en' template", async () => {
      const payload = new SendKycApprovedUSEvent({
        email: "fake+user@noba.com",
        firstName: "Fake",
        lastName: "Name",
        locale: "en",
        nobaUserID: "fake-noba-user-id",
      });

      await eventHandler.sendKycApprovedUSEmail(payload);

      const [emailRequest] = capture(emailClient.sendEmail).last();
      expect(emailRequest).toStrictEqual({
        to: payload.email,
        from: SENDER_EMAIL,
        templateId: EmailTemplates.ID_VERIFICATION_SUCCESSFUL_US_EMAIL["en"],
        dynamicTemplateData: {
          firstName: payload.firstName,
        },
      });
    });

    it("should call eventHandler with SendKycApprovedUS event with 'es' template", async () => {
      const payload = new SendKycApprovedUSEvent({
        email: "fake+user@noba.com",
        firstName: "Fake",
        lastName: "Name",
        locale: "es_co",
        nobaUserID: "fake-noba-user-id",
      });

      await eventHandler.sendKycApprovedUSEmail(payload);

      const [emailRequest] = capture(emailClient.sendEmail).last();
      expect(emailRequest).toStrictEqual({
        to: payload.email,
        from: SENDER_EMAIL,
        templateId: EmailTemplates.ID_VERIFICATION_SUCCESSFUL_US_EMAIL["es"],
        dynamicTemplateData: {
          firstName: payload.firstName,
        },
      });
    });

    it("should fallback to en when locale is not found", async () => {
      const payload = new SendKycApprovedUSEvent({
        email: "fake+user@noba.com",
        firstName: "Fake",
        lastName: "Name",
        locale: "fake-locale",
        nobaUserID: "fake-noba-user-id",
      });

      await eventHandler.sendKycApprovedUSEmail(payload);

      const [emailRequest] = capture(emailClient.sendEmail).last();
      expect(emailRequest).toStrictEqual({
        to: payload.email,
        from: SENDER_EMAIL,
        templateId: EmailTemplates.ID_VERIFICATION_SUCCESSFUL_US_EMAIL["en"],
        dynamicTemplateData: {
          firstName: payload.firstName,
        },
      });
    });
  });

  it("should call eventHandler with SendKycApprovedNonUS event", async () => {
    const payload = new SendKycApprovedNonUSEvent({
      email: "fake+user@noba.com",
      firstName: "Fake",
      lastName: "Name",
      locale: "en",
      nobaUserID: "fake-noba-user-id",
    });

    await eventHandler.sendKycApprovedNonUSEmail(payload);

    const [emailRequest] = capture(emailClient.sendEmail).last();
    expect(emailRequest).toStrictEqual({
      to: payload.email,
      from: SENDER_EMAIL,
      templateId: EmailTemplates.ID_VERIFICATION_SUCCESSFUL_NON_US_EMAIL["en"],
      dynamicTemplateData: {
        user_email: payload.email,
        username: Utils.getUsernameFromNameParts(payload.firstName, payload.lastName),
      },
    });
  });

  describe("SendKycDeniedEvent", () => {
    it("should call eventHandler with SendKycDenied event with 'en' template", async () => {
      const payload = new SendKycDeniedEvent({
        email: "fake+user@noba.com",
        firstName: "Fake",
        lastName: "Name",
        locale: "en",
        nobaUserID: "fake-noba-user-id",
      });
      await eventHandler.sendKycDeniedEmail(payload);

      const [emailRequest] = capture(emailClient.sendEmail).last();
      expect(emailRequest).toStrictEqual({
        to: payload.email,
        from: SENDER_EMAIL,
        templateId: EmailTemplates.KYC_DENIED_EMAIL["en"],
        dynamicTemplateData: {
          firstName: payload.firstName,
        },
      });
    });

    it("should call eventHandler with SendKycDenied event with 'es' template", async () => {
      const payload = new SendKycDeniedEvent({
        email: "fake+user@noba.com",
        firstName: "Fake",
        lastName: "Name",
        locale: "es_co",
        nobaUserID: "fake-noba-user-id",
      });
      await eventHandler.sendKycDeniedEmail(payload);

      const [emailRequest] = capture(emailClient.sendEmail).last();
      expect(emailRequest).toStrictEqual({
        to: payload.email,
        from: SENDER_EMAIL,
        templateId: EmailTemplates.KYC_DENIED_EMAIL["es"],
        dynamicTemplateData: {
          firstName: payload.firstName,
        },
      });
    });

    it("should fallback to en when locale is not found", async () => {
      const payload = new SendKycDeniedEvent({
        email: "fake+user@noba.com",
        firstName: "Fake",
        lastName: "Name",
        locale: "fake-locale",
        nobaUserID: "fake-noba-user-id",
      });
      await eventHandler.sendKycDeniedEmail(payload);

      const [emailRequest] = capture(emailClient.sendEmail).last();
      expect(emailRequest).toStrictEqual({
        to: payload.email,
        from: SENDER_EMAIL,
        templateId: EmailTemplates.KYC_DENIED_EMAIL["en"],
        dynamicTemplateData: {
          firstName: payload.firstName,
        },
      });
    });
  });

  describe("SendKycPendingOrFlaggedEvent", () => {
    it("should call eventHandler with SendKycPendingOrFlagged event with 'en' template", async () => {
      const payload = new SendKycPendingOrFlaggedEvent({
        email: "fake+user@noba.com",
        firstName: "Fake",
        lastName: "Name",
        locale: "en",
        nobaUserID: "fake-noba-user-id",
      });
      await eventHandler.sendKycPendingOrFlaggedEmail(payload);

      const [emailRequest] = capture(emailClient.sendEmail).last();
      expect(emailRequest).toStrictEqual({
        to: payload.email,
        from: SENDER_EMAIL,
        templateId: EmailTemplates.KYC_FLAGGED_EMAIL["en"],
        dynamicTemplateData: {
          firstName: payload.firstName,
        },
      });
    });

    it("should call eventHandler with SendKycPendingOrFlagged event with 'es' template", async () => {
      const payload = new SendKycPendingOrFlaggedEvent({
        email: "fake+user@noba.com",
        firstName: "Fake",
        lastName: "Name",
        locale: "es_co",
        nobaUserID: "fake-noba-user-id",
      });
      await eventHandler.sendKycPendingOrFlaggedEmail(payload);

      const [emailRequest] = capture(emailClient.sendEmail).last();
      expect(emailRequest).toStrictEqual({
        to: payload.email,
        from: SENDER_EMAIL,
        templateId: EmailTemplates.KYC_FLAGGED_EMAIL["es"],
        dynamicTemplateData: {
          firstName: payload.firstName,
        },
      });
    });

    it("should fallback to en when locale is not found", async () => {
      const payload = new SendKycPendingOrFlaggedEvent({
        email: "fake+user@noba.com",
        firstName: "Fake",
        lastName: "Name",
        locale: "fake-locale",
        nobaUserID: "fake-noba-user-id",
      });
      await eventHandler.sendKycPendingOrFlaggedEmail(payload);

      const [emailRequest] = capture(emailClient.sendEmail).last();
      expect(emailRequest).toStrictEqual({
        to: payload.email,
        from: SENDER_EMAIL,
        templateId: EmailTemplates.KYC_FLAGGED_EMAIL["en"],
        dynamicTemplateData: {
          firstName: payload.firstName,
        },
      });
    });
  });

  describe("SendKycSuccessfulEvent", () => {
    it("should call eventHandler with SendDocVerificationPending event with 'en' template", async () => {
      const payload = new SendDocumentVerificationPendingEvent({
        email: "fake+user@noba.com",
        firstName: "Fake",
        lastName: "Name",
        locale: "en",
        nobaUserID: "fake-noba-user-id",
      });

      await eventHandler.sendDocVerificationPendingEmail(payload);

      const [emailRequest] = capture(emailClient.sendEmail).last();
      expect(emailRequest).toStrictEqual({
        to: payload.email,
        from: SENDER_EMAIL,
        templateId: EmailTemplates.DOC_VERIFICATION_PENDING_EMAIL["en"],
        dynamicTemplateData: {
          firstName: payload.firstName,
        },
      });
    });

    it("should call eventHandler with SendDocVerificationPending event with 'es' template", async () => {
      const payload = new SendDocumentVerificationPendingEvent({
        email: "fake+user@noba.com",
        firstName: "Fake",
        lastName: "Name",
        locale: "es_co",
        nobaUserID: "fake-noba-user-id",
      });

      await eventHandler.sendDocVerificationPendingEmail(payload);

      const [emailRequest] = capture(emailClient.sendEmail).last();
      expect(emailRequest).toStrictEqual({
        to: payload.email,
        from: SENDER_EMAIL,
        templateId: EmailTemplates.DOC_VERIFICATION_PENDING_EMAIL["es"],
        dynamicTemplateData: {
          firstName: payload.firstName,
        },
      });
    });

    it("should fallback to en when locale is not found", async () => {
      const payload = new SendDocumentVerificationPendingEvent({
        email: "fake+user@noba.com",
        firstName: "Fake",
        lastName: "Name",
        locale: "fake-locale",
        nobaUserID: "fake-noba-user-id",
      });

      await eventHandler.sendDocVerificationPendingEmail(payload);

      const [emailRequest] = capture(emailClient.sendEmail).last();
      expect(emailRequest).toStrictEqual({
        to: payload.email,
        from: SENDER_EMAIL,
        templateId: EmailTemplates.DOC_VERIFICATION_PENDING_EMAIL["en"],
        dynamicTemplateData: {
          firstName: payload.firstName,
        },
      });
    });
  });

  describe("SendDocVerificationRejected", () => {
    it("should call eventHandler with SendDocVerificationRejected event with 'en' template", async () => {
      const payload = new SendDocumentVerificationRejectedEvent({
        email: "fake+user@noba.com",
        firstName: "Fake",
        lastName: "Name",
        locale: "en",
        nobaUserID: "fake-noba-user-id",
      });

      await eventHandler.sendDocVerificationRejectedEmail(payload);

      const [emailRequest] = capture(emailClient.sendEmail).last();
      expect(emailRequest).toStrictEqual({
        to: payload.email,
        from: SENDER_EMAIL,
        templateId: EmailTemplates.DOC_VERIFICATION_REJECTED_EMAIL["en"],
        dynamicTemplateData: {
          user_email: payload.email,
          username: Utils.getUsernameFromNameParts(payload.firstName, payload.lastName),
        },
      });
    });

    it("should fallback to en when locale is not found", async () => {
      const payload = new SendDocumentVerificationRejectedEvent({
        email: "fake+user@noba.com",
        firstName: "Fake",
        lastName: "Name",
        locale: "fake-locale",
        nobaUserID: "fake-noba-user-id",
      });

      await eventHandler.sendDocVerificationRejectedEmail(payload);

      const [emailRequest] = capture(emailClient.sendEmail).last();
      expect(emailRequest).toStrictEqual({
        to: payload.email,
        from: SENDER_EMAIL,
        templateId: EmailTemplates.DOC_VERIFICATION_REJECTED_EMAIL["en"],
        dynamicTemplateData: {
          user_email: payload.email,
          username: Utils.getUsernameFromNameParts(payload.firstName, payload.lastName),
        },
      });
    });
  });

  describe("SendDocVerificationTechnicalFailure", () => {
    it("should call eventHandler with SendDocVerificationTechnicalFailure event with 'en' locale", async () => {
      const payload = new SendDocumentVerificationTechnicalFailureEvent({
        email: "fake+user@noba.com",
        firstName: "Fake",
        lastName: "Name",
        locale: "en",
        nobaUserID: "fake-noba-user-id",
      });
      await eventHandler.sendDocVerificationFailedTechEmail(payload);

      const [emailRequest] = capture(emailClient.sendEmail).last();
      expect(emailRequest).toStrictEqual({
        to: payload.email,
        from: SENDER_EMAIL,
        templateId: EmailTemplates.DOC_VERIFICATION_FAILED_TECH_EMAIL["en"],
        dynamicTemplateData: {
          user_email: payload.email,
          username: Utils.getUsernameFromNameParts(payload.firstName, payload.lastName),
        },
      });
    });

    it("should fallback to en when locale is not found", async () => {
      const payload = new SendDocumentVerificationTechnicalFailureEvent({
        email: "fake+user@noba.com",
        firstName: "Fake",
        lastName: "Name",
        locale: "fake-locale",
        nobaUserID: "fake-noba-user-id",
      });
      await eventHandler.sendDocVerificationFailedTechEmail(payload);

      const [emailRequest] = capture(emailClient.sendEmail).last();
      expect(emailRequest).toStrictEqual({
        to: payload.email,
        from: SENDER_EMAIL,
        templateId: EmailTemplates.DOC_VERIFICATION_FAILED_TECH_EMAIL["en"],
        dynamicTemplateData: {
          user_email: payload.email,
          username: Utils.getUsernameFromNameParts(payload.firstName, payload.lastName),
        },
      });
    });
  });

  it("should call eventHandler with SendCardAdded event", async () => {
    const payload = new SendCardAddedEvent({
      email: "fake+user@noba.com",
      firstName: "Fake",
      lastName: "Name",
      locale: "en",
      nobaUserID: "fake-noba-user-id",
      cardNetwork: "VISA",
      last4Digits: "1234",
    });
    await eventHandler.sendCardAddedEmail(payload);

    const [emailRequest] = capture(emailClient.sendEmail).last();
    expect(emailRequest).toStrictEqual({
      to: payload.email,
      from: SENDER_EMAIL,
      templateId: EmailTemplates.CARD_ADDED_EMAIL["en"],
      dynamicTemplateData: {
        user_email: payload.email,
        username: Utils.getUsernameFromNameParts(payload.firstName, payload.lastName),
        card_network: payload.cardNetwork,
        last_four: payload.last4Digits,
        support_url: SUPPORT_URL,
      },
    });
  });

  it("should call eventHandler with SendCardAdditionFailed event", async () => {
    const payload = new SendCardAdditionFailedEvent({
      email: "fake+user@noba.com",
      firstName: "Fake",
      lastName: "Name",
      locale: "en",
      nobaUserID: "fake-noba-user-id",
      last4Digits: "1234",
    });
    await eventHandler.sendCardAdditionFailedEmail(payload);

    const [emailRequest] = capture(emailClient.sendEmail).last();
    expect(emailRequest).toStrictEqual({
      to: payload.email,
      from: SENDER_EMAIL,
      templateId: EmailTemplates.CARD_ADDITION_FAILED_EMAIL["en"],
      dynamicTemplateData: {
        user_email: payload.email,
        username: Utils.getUsernameFromNameParts(payload.firstName, payload.lastName),
        last_four: payload.last4Digits,
        support_url: SUPPORT_URL,
      },
    });
  });

  it("should call eventHandler with SendCardDeleted event", async () => {
    const payload = new SendCardDeletedEvent({
      email: "fake+user@noba.com",
      firstName: "Fake",
      lastName: "Name",
      locale: "en",
      nobaUserID: "fake-noba-user-id",
      cardNetwork: "VISA",
      last4Digits: "1234",
    });
    await eventHandler.sendCardDeletedEmail(payload);

    const [emailRequest] = capture(emailClient.sendEmail).last();
    expect(emailRequest).toStrictEqual({
      to: payload.email,
      from: SENDER_EMAIL,
      templateId: EmailTemplates.CARD_DELETED_EMAIL["en"],
      dynamicTemplateData: {
        user_email: payload.email,
        username: Utils.getUsernameFromNameParts(payload.firstName, payload.lastName),
        card_network: payload.cardNetwork,
        last_four: payload.last4Digits,
        support_url: SUPPORT_URL,
      },
    });
  });

  describe("SendDepositCompletedEvent", () => {
    it("should call eventHandler with SendDepositCompleted event with 'en' template", async () => {
      const payload = new SendDepositCompletedEvent({
        email: "fake+user@noba.com",
        name: "First",
        handle: "fake-handle",
        params: getTransactionParams(WorkflowName.WALLET_DEPOSIT),
        pushTokens: [],
        locale: "en",
      });

      await eventHandler.sendDepositCompletedEmail(payload);
      const subtotal =
        Utils.roundTo2DecimalNumber(payload.params.creditAmount) +
        Utils.roundTo2DecimalNumber(payload.params.processingFees) +
        Utils.roundTo2DecimalNumber(payload.params.nobaFees);

      const [emailRequest] = capture(emailClient.sendEmail).last();
      expect(emailRequest).toStrictEqual({
        to: payload.email,
        from: SENDER_EMAIL,
        templateId: EmailTemplates.DEPOSIT_SUCCESSFUL_EMAIL["en"],
        dynamicTemplateData: {
          firstName: payload.name,
          debitAmount: Utils.roundTo2DecimalString(payload.params.debitAmount),
          debitCurrency: "COP",
          creditAmount: Utils.roundTo2DecimalString(payload.params.creditAmount),
          creditCurrency: "USDC",
          handle: payload.handle,
          transactionRef: payload.params.transactionRef,
          createdTimestamp: payload.params.createdTimestamp,
          exchangeRate: payload.params.exchangeRate,
          subtotal: Utils.roundTo2DecimalString(subtotal),
          processingFees: Utils.roundTo2DecimalString(payload.params.processingFees),
          nobaFees: Utils.roundTo2DecimalString(payload.params.nobaFees),
        },
      });
    });

    it("should call eventHandler with SendDepositCompleted event with 'es' template", async () => {
      const payload = new SendDepositCompletedEvent({
        email: "fake+user@noba.com",
        name: "First",
        handle: "fake-handle",
        params: getTransactionParams(WorkflowName.WALLET_DEPOSIT),
        pushTokens: [],
        locale: "es_co",
      });

      await eventHandler.sendDepositCompletedEmail(payload);
      const subtotal =
        Utils.roundTo2DecimalNumber(payload.params.creditAmount) +
        Utils.roundTo2DecimalNumber(payload.params.processingFees) +
        Utils.roundTo2DecimalNumber(payload.params.nobaFees);

      const [emailRequest] = capture(emailClient.sendEmail).last();
      expect(emailRequest).toStrictEqual({
        to: payload.email,
        from: SENDER_EMAIL,
        templateId: EmailTemplates.DEPOSIT_SUCCESSFUL_EMAIL["es"],
        dynamicTemplateData: {
          firstName: payload.name,
          debitAmount: Utils.roundTo2DecimalString(payload.params.debitAmount),
          debitCurrency: "COP",
          creditAmount: Utils.roundTo2DecimalString(payload.params.creditAmount),
          creditCurrency: "USDC",
          handle: payload.handle,
          transactionRef: payload.params.transactionRef,
          createdTimestamp: payload.params.createdTimestamp,
          exchangeRate: payload.params.exchangeRate,
          subtotal: Utils.roundTo2DecimalString(subtotal),
          processingFees: Utils.roundTo2DecimalString(payload.params.processingFees),
          nobaFees: Utils.roundTo2DecimalString(payload.params.nobaFees),
        },
      });
    });

    it("should fallback to 'en' template if locale is not supported", async () => {
      const payload = new SendDepositCompletedEvent({
        email: "fake+user@noba.com",
        name: "First",
        handle: "fake-handle",
        params: getTransactionParams(WorkflowName.WALLET_DEPOSIT),
        pushTokens: [],
        locale: "fake-locale",
      });

      await eventHandler.sendDepositCompletedEmail(payload);
      const subtotal =
        Utils.roundTo2DecimalNumber(payload.params.creditAmount) +
        Utils.roundTo2DecimalNumber(payload.params.processingFees) +
        Utils.roundTo2DecimalNumber(payload.params.nobaFees);

      const [emailRequest] = capture(emailClient.sendEmail).last();
      expect(emailRequest).toStrictEqual({
        to: payload.email,
        from: SENDER_EMAIL,
        templateId: EmailTemplates.DEPOSIT_SUCCESSFUL_EMAIL["en"],
        dynamicTemplateData: {
          firstName: payload.name,
          debitAmount: Utils.roundTo2DecimalString(payload.params.debitAmount),
          debitCurrency: "COP",
          creditAmount: Utils.roundTo2DecimalString(payload.params.creditAmount),
          creditCurrency: "USDC",
          handle: payload.handle,
          transactionRef: payload.params.transactionRef,
          createdTimestamp: payload.params.createdTimestamp,
          exchangeRate: payload.params.exchangeRate,
          subtotal: Utils.roundTo2DecimalString(subtotal),
          processingFees: Utils.roundTo2DecimalString(payload.params.processingFees),
          nobaFees: Utils.roundTo2DecimalString(payload.params.nobaFees),
        },
      });
    });
  });

  describe("SendDepositFailed", () => {
    it("should call eventHandler with SendDepositFailed event with 'en' template", async () => {
      const payload = new SendDepositFailedEvent({
        email: "fake+user@noba.com",
        name: "First",
        handle: "fake-handle",
        pushTokens: [],
        params: {
          ...getTransactionParams(WorkflowName.WALLET_DEPOSIT),
          reasonDeclined: "Failed",
        },
        locale: "en",
      });

      await eventHandler.sendDepositFailedEmail(payload);
      const subtotal =
        Utils.roundTo2DecimalNumber(payload.params.creditAmount) +
        Utils.roundTo2DecimalNumber(payload.params.processingFees) +
        Utils.roundTo2DecimalNumber(payload.params.nobaFees);

      const [emailRequest] = capture(emailClient.sendEmail).last();
      expect(emailRequest).toStrictEqual({
        to: payload.email,
        from: SENDER_EMAIL,
        templateId: EmailTemplates.DEPOSIT_FAILED_EMAIL["en"],
        dynamicTemplateData: {
          firstName: payload.name,
          debitAmount: Utils.roundTo2DecimalString(payload.params.debitAmount),
          debitCurrency: "COP",
          creditAmount: Utils.roundTo2DecimalString(payload.params.creditAmount),
          creditCurrency: "USDC",
          handle: payload.handle,
          transactionRef: payload.params.transactionRef,
          createdTimestamp: payload.params.createdTimestamp,
          exchangeRate: payload.params.exchangeRate,
          subtotal: Utils.roundTo2DecimalString(subtotal),
          processingFees: Utils.roundTo2DecimalString(payload.params.processingFees),
          nobaFees: Utils.roundTo2DecimalString(payload.params.nobaFees),
          reasonDeclined: payload.params.reasonDeclined,
        },
      });
    });

    it("should call eventHandler with SendDepositFailed event with 'es' template", async () => {
      const payload = new SendDepositFailedEvent({
        email: "fake+user@noba.com",
        name: "First",
        handle: "fake-handle",
        pushTokens: [],
        params: {
          ...getTransactionParams(WorkflowName.WALLET_DEPOSIT),
          reasonDeclined: "Failed",
        },
        locale: "es_co",
      });

      await eventHandler.sendDepositFailedEmail(payload);
      const subtotal =
        Utils.roundTo2DecimalNumber(payload.params.creditAmount) +
        Utils.roundTo2DecimalNumber(payload.params.processingFees) +
        Utils.roundTo2DecimalNumber(payload.params.nobaFees);

      const [emailRequest] = capture(emailClient.sendEmail).last();
      expect(emailRequest).toStrictEqual({
        to: payload.email,
        from: SENDER_EMAIL,
        templateId: EmailTemplates.DEPOSIT_FAILED_EMAIL["es"],
        dynamicTemplateData: {
          firstName: payload.name,
          debitAmount: Utils.roundTo2DecimalString(payload.params.debitAmount),
          debitCurrency: "COP",
          creditAmount: Utils.roundTo2DecimalString(payload.params.creditAmount),
          creditCurrency: "USDC",
          handle: payload.handle,
          transactionRef: payload.params.transactionRef,
          createdTimestamp: payload.params.createdTimestamp,
          exchangeRate: payload.params.exchangeRate,
          subtotal: Utils.roundTo2DecimalString(subtotal),
          processingFees: Utils.roundTo2DecimalString(payload.params.processingFees),
          nobaFees: Utils.roundTo2DecimalString(payload.params.nobaFees),
          reasonDeclined: payload.params.reasonDeclined,
        },
      });
    });

    it("should fallback to 'en' when locale is not found", async () => {
      const payload = new SendDepositFailedEvent({
        email: "fake+user@noba.com",
        name: "First",
        handle: "fake-handle",
        pushTokens: [],
        params: {
          ...getTransactionParams(WorkflowName.WALLET_DEPOSIT),
          reasonDeclined: "Failed",
        },
        locale: "fake-locale",
      });

      await eventHandler.sendDepositFailedEmail(payload);
      const subtotal =
        Utils.roundTo2DecimalNumber(payload.params.creditAmount) +
        Utils.roundTo2DecimalNumber(payload.params.processingFees) +
        Utils.roundTo2DecimalNumber(payload.params.nobaFees);

      const [emailRequest] = capture(emailClient.sendEmail).last();
      expect(emailRequest).toStrictEqual({
        to: payload.email,
        from: SENDER_EMAIL,
        templateId: EmailTemplates.DEPOSIT_FAILED_EMAIL["en"],
        dynamicTemplateData: {
          firstName: payload.name,
          debitAmount: Utils.roundTo2DecimalString(payload.params.debitAmount),
          debitCurrency: "COP",
          creditAmount: Utils.roundTo2DecimalString(payload.params.creditAmount),
          creditCurrency: "USDC",
          handle: payload.handle,
          transactionRef: payload.params.transactionRef,
          createdTimestamp: payload.params.createdTimestamp,
          exchangeRate: payload.params.exchangeRate,
          subtotal: Utils.roundTo2DecimalString(subtotal),
          processingFees: Utils.roundTo2DecimalString(payload.params.processingFees),
          nobaFees: Utils.roundTo2DecimalString(payload.params.nobaFees),
          reasonDeclined: payload.params.reasonDeclined,
        },
      });
    });
  });

  describe("SendDepositInitiatedEmail", () => {
    it("should call eventHandler with SendDepositInitiated event with 'en' template", async () => {
      const payload = new SendDepositInitiatedEvent({
        email: "fake+user@noba.com",
        name: "First",
        handle: "fake-handle",
        params: {
          ...getTransactionParams(WorkflowName.WALLET_DEPOSIT),
        },
        locale: "en",
      });

      await eventHandler.sendDepositInitiatedEmail(payload);
      const subtotal =
        Utils.roundTo2DecimalNumber(payload.params.creditAmount) +
        Utils.roundTo2DecimalNumber(payload.params.processingFees) +
        Utils.roundTo2DecimalNumber(payload.params.nobaFees);

      const [emailRequest] = capture(emailClient.sendEmail).last();
      expect(emailRequest).toStrictEqual({
        to: payload.email,
        from: SENDER_EMAIL,
        templateId: EmailTemplates.DEPOSIT_INITIATED_EMAIL["en"],
        dynamicTemplateData: {
          firstName: payload.name,
          debitAmount: Utils.roundTo2DecimalString(payload.params.debitAmount),
          debitCurrency: "COP",
          creditAmount: Utils.roundTo2DecimalString(payload.params.creditAmount),
          creditCurrency: "USDC",
          handle: payload.handle,
          transactionRef: payload.params.transactionRef,
          createdTimestamp: payload.params.createdTimestamp,
          exchangeRate: payload.params.exchangeRate,
          subtotal: Utils.roundTo2DecimalString(subtotal),
          processingFees: Utils.roundTo2DecimalString(payload.params.processingFees),
          nobaFees: Utils.roundTo2DecimalString(payload.params.nobaFees),
        },
      });
    });

    it("should call eventHandler with SendDepositInitiated event with 'es' template", async () => {
      const payload = new SendDepositInitiatedEvent({
        email: "fake+user@noba.com",
        name: "First",
        handle: "fake-handle",
        params: {
          ...getTransactionParams(WorkflowName.WALLET_DEPOSIT),
        },
        locale: "es_co",
      });

      await eventHandler.sendDepositInitiatedEmail(payload);
      const subtotal =
        Utils.roundTo2DecimalNumber(payload.params.creditAmount) +
        Utils.roundTo2DecimalNumber(payload.params.processingFees) +
        Utils.roundTo2DecimalNumber(payload.params.nobaFees);

      const [emailRequest] = capture(emailClient.sendEmail).last();
      expect(emailRequest).toStrictEqual({
        to: payload.email,
        from: SENDER_EMAIL,
        templateId: EmailTemplates.DEPOSIT_INITIATED_EMAIL["es"],
        dynamicTemplateData: {
          firstName: payload.name,
          debitAmount: Utils.roundTo2DecimalString(payload.params.debitAmount),
          debitCurrency: "COP",
          creditAmount: Utils.roundTo2DecimalString(payload.params.creditAmount),
          creditCurrency: "USDC",
          handle: payload.handle,
          transactionRef: payload.params.transactionRef,
          createdTimestamp: payload.params.createdTimestamp,
          exchangeRate: payload.params.exchangeRate,
          subtotal: Utils.roundTo2DecimalString(subtotal),
          processingFees: Utils.roundTo2DecimalString(payload.params.processingFees),
          nobaFees: Utils.roundTo2DecimalString(payload.params.nobaFees),
        },
      });
    });

    it("should fallback to 'en' template if locale is not supported", async () => {
      const payload = new SendDepositInitiatedEvent({
        email: "fake+user@noba.com",
        name: "First",
        handle: "fake-handle",
        params: {
          ...getTransactionParams(WorkflowName.WALLET_DEPOSIT),
        },
        locale: "fake-locale",
      });

      await eventHandler.sendDepositInitiatedEmail(payload);
      const subtotal =
        Utils.roundTo2DecimalNumber(payload.params.creditAmount) +
        Utils.roundTo2DecimalNumber(payload.params.processingFees) +
        Utils.roundTo2DecimalNumber(payload.params.nobaFees);

      const [emailRequest] = capture(emailClient.sendEmail).last();
      expect(emailRequest).toStrictEqual({
        to: payload.email,
        from: SENDER_EMAIL,
        templateId: EmailTemplates.DEPOSIT_INITIATED_EMAIL["en"],
        dynamicTemplateData: {
          firstName: payload.name,
          debitAmount: Utils.roundTo2DecimalString(payload.params.debitAmount),
          debitCurrency: "COP",
          creditAmount: Utils.roundTo2DecimalString(payload.params.creditAmount),
          creditCurrency: "USDC",
          handle: payload.handle,
          transactionRef: payload.params.transactionRef,
          createdTimestamp: payload.params.createdTimestamp,
          exchangeRate: payload.params.exchangeRate,
          subtotal: Utils.roundTo2DecimalString(subtotal),
          processingFees: Utils.roundTo2DecimalString(payload.params.processingFees),
          nobaFees: Utils.roundTo2DecimalString(payload.params.nobaFees),
        },
      });
    });
  });

  describe("SendWithdrawalCompleted", () => {
    it("should call eventHandler with SendWithdrawalCompleted event with 'en' template", async () => {
      const payload = new SendWithdrawalCompletedEvent({
        email: "fake+user@noba.com",
        name: "First",
        handle: "fake-handle",
        params: {
          ...getTransactionParams(WorkflowName.WALLET_WITHDRAWAL),
        },
        pushTokens: [],
        locale: "en",
      });

      await eventHandler.sendWithdrawalCompletedEmail(payload);
      const subtotal =
        Utils.roundTo2DecimalNumber(payload.params.debitAmount) -
        Utils.roundTo2DecimalNumber(payload.params.processingFees) -
        Utils.roundTo2DecimalNumber(payload.params.nobaFees);

      const [emailRequest] = capture(emailClient.sendEmail).last();
      expect(emailRequest).toStrictEqual({
        to: payload.email,
        from: SENDER_EMAIL,
        templateId: EmailTemplates.WITHDRAWAL_SUCCESSFUL_EMAIL["en"],
        dynamicTemplateData: {
          firstName: payload.name,
          debitAmount: Utils.roundTo2DecimalString(payload.params.debitAmount),
          debitCurrency: "USDC",
          creditAmount: Utils.roundTo2DecimalString(payload.params.creditAmount),
          creditCurrency: "COP",
          handle: payload.handle,
          transactionRef: payload.params.transactionRef,
          createdTimestamp: payload.params.createdTimestamp,
          exchangeRate: payload.params.exchangeRate,
          subtotal: Utils.roundTo2DecimalString(subtotal),
          processingFees: Utils.roundTo2DecimalString(payload.params.processingFees),
          nobaFees: Utils.roundTo2DecimalString(payload.params.nobaFees),
        },
      });
    });

    it("should call eventHandler with SendWithdrawalCompleted event with 'es' template", async () => {
      const payload = new SendWithdrawalCompletedEvent({
        email: "fake+user@noba.com",
        name: "First",
        handle: "fake-handle",
        params: {
          ...getTransactionParams(WorkflowName.WALLET_WITHDRAWAL),
        },
        pushTokens: [],
        locale: "es_co",
      });

      await eventHandler.sendWithdrawalCompletedEmail(payload);
      const subtotal =
        Utils.roundTo2DecimalNumber(payload.params.debitAmount) -
        Utils.roundTo2DecimalNumber(payload.params.processingFees) -
        Utils.roundTo2DecimalNumber(payload.params.nobaFees);

      const [emailRequest] = capture(emailClient.sendEmail).last();
      expect(emailRequest).toStrictEqual({
        to: payload.email,
        from: SENDER_EMAIL,
        templateId: EmailTemplates.WITHDRAWAL_SUCCESSFUL_EMAIL["es"],
        dynamicTemplateData: {
          firstName: payload.name,
          debitAmount: Utils.roundTo2DecimalString(payload.params.debitAmount),
          debitCurrency: "USDC",
          creditAmount: Utils.roundTo2DecimalString(payload.params.creditAmount),
          creditCurrency: "COP",
          handle: payload.handle,
          transactionRef: payload.params.transactionRef,
          createdTimestamp: payload.params.createdTimestamp,
          exchangeRate: payload.params.exchangeRate,
          subtotal: Utils.roundTo2DecimalString(subtotal),
          processingFees: Utils.roundTo2DecimalString(payload.params.processingFees),
          nobaFees: Utils.roundTo2DecimalString(payload.params.nobaFees),
        },
      });
    });

    it("should fallback to 'en' template if locale is not supported", async () => {
      const payload = new SendWithdrawalCompletedEvent({
        email: "fake+user@noba.com",
        name: "First",
        handle: "fake-handle",
        params: {
          ...getTransactionParams(WorkflowName.WALLET_WITHDRAWAL),
        },
        pushTokens: [],
        locale: "fake-locale",
      });

      await eventHandler.sendWithdrawalCompletedEmail(payload);
      const subtotal =
        Utils.roundTo2DecimalNumber(payload.params.debitAmount) -
        Utils.roundTo2DecimalNumber(payload.params.processingFees) -
        Utils.roundTo2DecimalNumber(payload.params.nobaFees);

      const [emailRequest] = capture(emailClient.sendEmail).last();
      expect(emailRequest).toStrictEqual({
        to: payload.email,
        from: SENDER_EMAIL,
        templateId: EmailTemplates.WITHDRAWAL_SUCCESSFUL_EMAIL["en"],
        dynamicTemplateData: {
          firstName: payload.name,
          debitAmount: Utils.roundTo2DecimalString(payload.params.debitAmount),
          debitCurrency: "USDC",
          creditAmount: Utils.roundTo2DecimalString(payload.params.creditAmount),
          creditCurrency: "COP",
          handle: payload.handle,
          transactionRef: payload.params.transactionRef,
          createdTimestamp: payload.params.createdTimestamp,
          exchangeRate: payload.params.exchangeRate,
          subtotal: Utils.roundTo2DecimalString(subtotal),
          processingFees: Utils.roundTo2DecimalString(payload.params.processingFees),
          nobaFees: Utils.roundTo2DecimalString(payload.params.nobaFees),
        },
      });
    });
  });

  describe("SendWithdrawalInitiated", () => {
    it("should call eventHandler with SendWithdrawalInitiated event with en template", async () => {
      const payload = new SendWithdrawalInitiatedEvent({
        email: "fake+user@noba.com",
        name: "First",
        handle: "fake-handle",
        params: {
          ...getTransactionParams(WorkflowName.WALLET_WITHDRAWAL),
        },
        locale: "en",
      });

      await eventHandler.sendWithdrawalInitiatedEmail(payload);
      const subtotal =
        Utils.roundTo2DecimalNumber(payload.params.debitAmount) -
        Utils.roundTo2DecimalNumber(payload.params.processingFees) -
        Utils.roundTo2DecimalNumber(payload.params.nobaFees);

      const [emailRequest] = capture(emailClient.sendEmail).last();
      expect(emailRequest).toStrictEqual({
        to: payload.email,
        from: SENDER_EMAIL,
        templateId: EmailTemplates.WITHDRAWAL_INITIATED_EMAIL["en"],
        dynamicTemplateData: {
          firstName: payload.name,
          debitAmount: Utils.roundTo2DecimalString(payload.params.debitAmount),
          debitCurrency: "USDC",
          creditAmount: Utils.roundTo2DecimalString(payload.params.creditAmount),
          creditCurrency: "COP",
          handle: payload.handle,
          transactionRef: payload.params.transactionRef,
          createdTimestamp: payload.params.createdTimestamp,
          exchangeRate: payload.params.exchangeRate,
          subtotal: Utils.roundTo2DecimalString(subtotal),
          processingFees: Utils.roundTo2DecimalString(payload.params.processingFees),
          nobaFees: Utils.roundTo2DecimalString(payload.params.nobaFees),
        },
      });
    });

    it("should call eventHandler with SendWithdrawalInitiated event with es template", async () => {
      const payload = new SendWithdrawalInitiatedEvent({
        email: "fake+user@noba.com",
        name: "First",
        handle: "fake-handle",
        params: {
          ...getTransactionParams(WorkflowName.WALLET_WITHDRAWAL),
        },
        locale: "es_co",
      });

      await eventHandler.sendWithdrawalInitiatedEmail(payload);
      const subtotal =
        Utils.roundTo2DecimalNumber(payload.params.debitAmount) -
        Utils.roundTo2DecimalNumber(payload.params.processingFees) -
        Utils.roundTo2DecimalNumber(payload.params.nobaFees);

      const [emailRequest] = capture(emailClient.sendEmail).last();
      expect(emailRequest).toStrictEqual({
        to: payload.email,
        from: SENDER_EMAIL,
        templateId: EmailTemplates.WITHDRAWAL_INITIATED_EMAIL["es"],
        dynamicTemplateData: {
          firstName: payload.name,
          debitAmount: Utils.roundTo2DecimalString(payload.params.debitAmount),
          debitCurrency: "USDC",
          creditAmount: Utils.roundTo2DecimalString(payload.params.creditAmount),
          creditCurrency: "COP",
          handle: payload.handle,
          transactionRef: payload.params.transactionRef,
          createdTimestamp: payload.params.createdTimestamp,
          exchangeRate: payload.params.exchangeRate,
          subtotal: Utils.roundTo2DecimalString(subtotal),
          processingFees: Utils.roundTo2DecimalString(payload.params.processingFees),
          nobaFees: Utils.roundTo2DecimalString(payload.params.nobaFees),
        },
      });
    });
  });

  describe("SendWithdrawalFailed", () => {
    it("should call eventHandler with SendWithdrawalFailed event with en template", async () => {
      const payload = new SendWithdrawalFailedEvent({
        email: "fake+user@noba.com",
        name: "First",
        handle: "fake-handle",
        pushTokens: [],
        params: {
          ...getTransactionParams(WorkflowName.WALLET_WITHDRAWAL),
          reasonDeclined: "Failed",
        },
        locale: "en",
      });

      await eventHandler.sendWithdrawalFailedEmail(payload);
      const subtotal =
        Utils.roundTo2DecimalNumber(payload.params.debitAmount) -
        Utils.roundTo2DecimalNumber(payload.params.processingFees) -
        Utils.roundTo2DecimalNumber(payload.params.nobaFees);

      const [emailRequest] = capture(emailClient.sendEmail).last();
      expect(emailRequest).toStrictEqual({
        to: payload.email,
        from: SENDER_EMAIL,
        templateId: EmailTemplates.WITHDRAWAL_FAILED_EMAIL["en"],
        dynamicTemplateData: {
          firstName: payload.name,
          debitAmount: Utils.roundTo2DecimalString(payload.params.debitAmount),
          debitCurrency: "USDC",
          creditAmount: Utils.roundTo2DecimalString(payload.params.creditAmount),
          creditCurrency: "COP",
          handle: payload.handle,
          transactionRef: payload.params.transactionRef,
          createdTimestamp: payload.params.createdTimestamp,
          exchangeRate: payload.params.exchangeRate,
          subtotal: Utils.roundTo2DecimalString(subtotal),
          processingFees: Utils.roundTo2DecimalString(payload.params.processingFees),
          nobaFees: Utils.roundTo2DecimalString(payload.params.nobaFees),
          reasonDeclined: payload.params.reasonDeclined,
        },
      });
    });

    it("should call eventHandler with SendWithdrawalFailed event with es template", async () => {
      const payload = new SendWithdrawalFailedEvent({
        email: "fake+user@noba.com",
        name: "First",
        handle: "fake-handle",
        pushTokens: [],
        params: {
          ...getTransactionParams(WorkflowName.WALLET_WITHDRAWAL),
          reasonDeclined: "Failed",
        },
        locale: "es_co",
      });

      await eventHandler.sendWithdrawalFailedEmail(payload);
      const subtotal =
        Utils.roundTo2DecimalNumber(payload.params.debitAmount) -
        Utils.roundTo2DecimalNumber(payload.params.processingFees) -
        Utils.roundTo2DecimalNumber(payload.params.nobaFees);

      const [emailRequest] = capture(emailClient.sendEmail).last();
      expect(emailRequest).toStrictEqual({
        to: payload.email,
        from: SENDER_EMAIL,
        templateId: EmailTemplates.WITHDRAWAL_FAILED_EMAIL["es"],
        dynamicTemplateData: {
          firstName: payload.name,
          debitAmount: Utils.roundTo2DecimalString(payload.params.debitAmount),
          debitCurrency: "USDC",
          creditAmount: Utils.roundTo2DecimalString(payload.params.creditAmount),
          creditCurrency: "COP",
          handle: payload.handle,
          transactionRef: payload.params.transactionRef,
          createdTimestamp: payload.params.createdTimestamp,
          exchangeRate: payload.params.exchangeRate,
          subtotal: Utils.roundTo2DecimalString(subtotal),
          processingFees: Utils.roundTo2DecimalString(payload.params.processingFees),
          nobaFees: Utils.roundTo2DecimalString(payload.params.nobaFees),
          reasonDeclined: payload.params.reasonDeclined,
        },
      });
    });
  });

  describe("SendTransferCompleted", () => {
    it("should call eventHandler with SendTransferCompleted event with 'en' template", async () => {
      const payload = new SendTransferCompletedEvent({
        email: "fake+user@noba.com",
        name: "First",
        handle: "fake-handle",
        params: {
          ...getTransactionParams(WorkflowName.WALLET_TRANSFER),
          creditConsumer_firstName: "Justin",
          creditConsumer_lastName: "Ashworth",
          creditConsumer_handle: "justin",
          debitConsumer_handle: "gal",
        },
        pushTokens: [],
        locale: "en",
      });

      await eventHandler.sendTransferCompletedEmail(payload);

      const [emailRequest] = capture(emailClient.sendEmail).last();
      expect(emailRequest).toStrictEqual({
        to: payload.email,
        from: SENDER_EMAIL,
        templateId: EmailTemplates.TRANSFER_SUCCESSFUL_EMAIL["en"],
        dynamicTemplateData: {
          creditConsumer_firstName: payload.params.creditConsumer_firstName,
          creditConsumer_lastName: payload.params.creditConsumer_lastName,
          debitConsumer_handle: payload.params.debitConsumer_handle,
          creditConsumer_handle: payload.params.creditConsumer_handle,
          firstName: payload.name,
          debitAmount: Utils.roundTo2DecimalString(payload.params.debitAmount),
          debitCurrency: "USDC",
          creditAmount: Utils.roundTo2DecimalString(payload.params.creditAmount),
          creditCurrency: "USDC",
          transactionRef: payload.params.transactionRef,
          createdTimestamp: payload.params.createdTimestamp,
          processingFees: Utils.roundTo2DecimalString(payload.params.processingFees),
          nobaFees: Utils.roundTo2DecimalString(payload.params.nobaFees),
        },
      });
    });
  });

  describe("SendTransferReceived", () => {
    it("should call eventHandler with SendTransferReceived event with en template", async () => {
      const payload = new SendTransferReceivedEvent({
        email: "fake+user@noba.com",
        name: "First",
        handle: "fake-handle",
        params: {
          ...getTransactionParams(WorkflowName.WALLET_TRANSFER),
          creditConsumer_firstName: "Justin",
          creditConsumer_lastName: "Ashworth",
          creditConsumer_handle: "justin",
          debitConsumer_handle: "gal",
          debitConsumer_firstName: "Gal",
          debitConsumer_lastName: "Ben Chanoch",
        },
        pushTokens: [],
        locale: "en",
      });

      await eventHandler.sendTransferReceivedEvent(payload);

      const [emailRequest] = capture(emailClient.sendEmail).last();
      expect(emailRequest).toStrictEqual({
        to: payload.email,
        from: SENDER_EMAIL,
        templateId: EmailTemplates.TRANSFER_RECEIVED_EMAIL["en"],
        dynamicTemplateData: {
          creditConsumer_firstName: payload.params.creditConsumer_firstName,
          creditConsumer_lastName: payload.params.creditConsumer_lastName,
          debitConsumer_handle: payload.params.debitConsumer_handle,
          creditConsumer_handle: payload.params.creditConsumer_handle,
          debitConsumer_firstName: payload.params.debitConsumer_firstName,
          debitConsumer_lastName: payload.params.debitConsumer_lastName,
          firstName: payload.name,
          debitAmount: Utils.roundTo2DecimalString(payload.params.debitAmount),
          debitCurrency: "USDC",
          creditAmount: Utils.roundTo2DecimalString(payload.params.creditAmount),
          creditCurrency: "USDC",
          transactionRef: payload.params.transactionRef,
          createdTimestamp: payload.params.createdTimestamp,
          processingFees: Utils.roundTo2DecimalString(payload.params.processingFees),
          nobaFees: Utils.roundTo2DecimalString(payload.params.nobaFees),
        },
      });
    });
  });

  describe("SendTransferFailed", () => {
    it("should call eventHandler with SendTransferFailed event", async () => {
      const payload = new SendTransferFailedEvent({
        email: "fake+user@noba.com",
        name: "First",
        handle: "fake-handle",
        pushTokens: [],
        params: {
          ...getTransactionParams(WorkflowName.WALLET_TRANSFER),
          creditConsumer_firstName: "Justin",
          creditConsumer_lastName: "Ashworth",
          creditConsumer_handle: "justin",
          debitConsumer_handle: "gal",
          reasonDeclined: "Failed transfer",
        },
        locale: "en",
      });

      await eventHandler.sendTransferFailedEmail(payload);

      const [emailRequest] = capture(emailClient.sendEmail).last();
      expect(emailRequest).toStrictEqual({
        to: payload.email,
        from: SENDER_EMAIL,
        templateId: EmailTemplates.TRANSFER_FAILED_EMAIL["en"],
        dynamicTemplateData: {
          creditConsumer_firstName: payload.params.creditConsumer_firstName,
          creditConsumer_lastName: payload.params.creditConsumer_lastName,
          debitConsumer_handle: payload.params.debitConsumer_handle,
          creditConsumer_handle: payload.params.creditConsumer_handle,
          firstName: payload.name,
          debitAmount: Utils.roundTo2DecimalString(payload.params.debitAmount),
          debitCurrency: "USDC",
          creditAmount: Utils.roundTo2DecimalString(payload.params.creditAmount),
          creditCurrency: "USDC",
          transactionRef: payload.params.transactionRef,
          createdTimestamp: payload.params.createdTimestamp,
          processingFees: Utils.roundTo2DecimalString(payload.params.processingFees),
          nobaFees: Utils.roundTo2DecimalString(payload.params.nobaFees),
          reasonDeclined: "Failed transfer",
        },
      });
    });
  });

  describe("SendPayrollDepositCompletedEvent", () => {
    it("should call eventHandler with SendPayrollDepositCompletedEvent event with 'en' template", async () => {
      const payload = new SendPayrollDepositCompletedEvent({
        email: "fake+user@noba.com",
        name: "First",
        handle: "fake-handle",
        pushTokens: [],
        params: {
          ...getTransactionParams(WorkflowName.PAYROLL_DEPOSIT),
          companyName: "Noba",
        },
        locale: "en",
      });

      await eventHandler.sendPayrollDepositCompletedEmail(payload);
      const subtotal =
        Utils.roundTo2DecimalNumber(payload.params.creditAmount) +
        Utils.roundTo2DecimalNumber(payload.params.processingFees) +
        Utils.roundTo2DecimalNumber(payload.params.nobaFees);

      const [emailRequest] = capture(emailClient.sendEmail).last();
      expect(emailRequest).toStrictEqual({
        to: payload.email,
        from: SENDER_EMAIL,
        templateId: EmailTemplates.PAYROLL_DEPOSIT_COMPLETED_EMAIL["en"],
        dynamicTemplateData: {
          firstName: payload.name,
          companyName: payload.params.companyName,
          debitAmount: Utils.roundTo2DecimalString(payload.params.debitAmount),
          debitCurrency: "COP",
          creditAmount: Utils.roundTo2DecimalString(payload.params.creditAmount),
          creditCurrency: "USDC",
          handle: payload.handle,
          transactionRef: payload.params.transactionRef,
          executedTimestamp: payload.params.createdTimestamp,
          exchangeRate: payload.params.exchangeRate,
          subtotal: Utils.roundTo2DecimalString(subtotal),
          processingFees: Utils.roundTo2DecimalString(payload.params.processingFees),
          nobaFees: Utils.roundTo2DecimalString(payload.params.nobaFees),
        },
      });
    });

    it("should call eventHandler with SendPayrollDepositCompleted event with 'es' template", async () => {
      const payload = new SendPayrollDepositCompletedEvent({
        email: "fake+user@noba.com",
        name: "First",
        handle: "fake-handle",
        pushTokens: [],
        params: {
          ...getTransactionParams(WorkflowName.PAYROLL_DEPOSIT),
          companyName: "Noba",
        },
        locale: "es_co",
      });

      await eventHandler.sendPayrollDepositCompletedEmail(payload);
      const subtotal =
        Utils.roundTo2DecimalNumber(payload.params.creditAmount) +
        Utils.roundTo2DecimalNumber(payload.params.processingFees) +
        Utils.roundTo2DecimalNumber(payload.params.nobaFees);

      const [emailRequest] = capture(emailClient.sendEmail).last();
      expect(emailRequest).toStrictEqual({
        to: payload.email,
        from: SENDER_EMAIL,
        templateId: EmailTemplates.PAYROLL_DEPOSIT_COMPLETED_EMAIL["es"],
        dynamicTemplateData: {
          firstName: payload.name,
          companyName: payload.params.companyName,
          debitAmount: Utils.roundTo2DecimalString(payload.params.debitAmount),
          debitCurrency: "COP",
          creditAmount: Utils.roundTo2DecimalString(payload.params.creditAmount),
          creditCurrency: "USDC",
          handle: payload.handle,
          transactionRef: payload.params.transactionRef,
          executedTimestamp: payload.params.createdTimestamp,
          exchangeRate: payload.params.exchangeRate,
          subtotal: Utils.roundTo2DecimalString(subtotal),
          processingFees: Utils.roundTo2DecimalString(payload.params.processingFees),
          nobaFees: Utils.roundTo2DecimalString(payload.params.nobaFees),
        },
      });
    });

    it("should fallback to 'en' template if locale is not supported", async () => {
      const payload = new SendPayrollDepositCompletedEvent({
        email: "fake+user@noba.com",
        name: "First",
        handle: "fake-handle",
        pushTokens: [],
        params: {
          ...getTransactionParams(WorkflowName.PAYROLL_DEPOSIT),
          companyName: "Noba",
        },
        locale: "fake-locale",
      });

      await eventHandler.sendPayrollDepositCompletedEmail(payload);
      const subtotal =
        Utils.roundTo2DecimalNumber(payload.params.creditAmount) +
        Utils.roundTo2DecimalNumber(payload.params.processingFees) +
        Utils.roundTo2DecimalNumber(payload.params.nobaFees);

      const [emailRequest] = capture(emailClient.sendEmail).last();
      expect(emailRequest).toStrictEqual({
        to: payload.email,
        from: SENDER_EMAIL,
        templateId: EmailTemplates.PAYROLL_DEPOSIT_COMPLETED_EMAIL["en"],
        dynamicTemplateData: {
          firstName: payload.name,
          companyName: payload.params.companyName,
          debitAmount: Utils.roundTo2DecimalString(payload.params.debitAmount),
          debitCurrency: "COP",
          creditAmount: Utils.roundTo2DecimalString(payload.params.creditAmount),
          creditCurrency: "USDC",
          handle: payload.handle,
          transactionRef: payload.params.transactionRef,
          executedTimestamp: payload.params.createdTimestamp,
          exchangeRate: payload.params.exchangeRate,
          subtotal: Utils.roundTo2DecimalString(subtotal),
          processingFees: Utils.roundTo2DecimalString(payload.params.processingFees),
          nobaFees: Utils.roundTo2DecimalString(payload.params.nobaFees),
        },
      });
    });
  });

  it("should call eventHandler with SendHardDecline event", async () => {
    const payload = new SendHardDeclineEvent({
      email: "fake+user@noba.com",
      firstName: "Fake",
      lastName: "Name",
      locale: "en",
      nobaUserID: "fake-noba-user-id",
      sessionID: "fake-session-id",
      transactionID: "fake-transaction-id",
      paymentToken: "fake-payment-token",
      responseCode: "fakeResponseCode",
      responseSummary: "Fake Summary",
      processor: "Checkout",
    });

    await eventHandler.sendHardDeclineEmail(payload);

    const [emailRequest] = capture(emailClient.sendEmail).last();
    expect(emailRequest).toStrictEqual({
      to: NOBA_COMPLIANCE_EMAIL,
      from: SENDER_EMAIL,
      templateId: EmailTemplates.NOBA_INTERNAL_HARD_DECLINE["en"],
      dynamicTemplateData: {
        user_email: payload.email,
        username: Utils.getUsernameFromNameParts(payload.firstName, payload.lastName),
        session_id: payload.sessionID,
        transaction_id: payload.transactionID,
        payment_token: payload.paymentToken,
        processor: payload.processor,
        timestamp: new Date().toLocaleString(),
        response_code: payload.responseCode,
        summary: payload.responseSummary,
      },
    });
  });

  describe("SendEmployerRequest", () => {
    it("should call eventHandler with SendEmployerRequest event with 'en' template", async () => {
      const payload = new SendEmployerRequestEvent({
        email: "fake+user@noba.com",
        locale: "es",
        firstName: "First",
        lastName: "Last",
      });

      await eventHandler.sendEmployerRequestEmail(payload);

      const [emailRequest] = capture(emailClient.sendEmail).last();
      expect(emailRequest).toStrictEqual({
        to: "kelsi@noba.com",
        from: SENDER_EMAIL,
        templateId: EmailTemplates.EMPLOYER_REQUEST_EMAIL["en"],
        dynamicTemplateData: {
          firstName: payload.firstName,
          lastName: payload.lastName,
          employerEmail: payload.email,
        },
      });
    });
  });
});

function getTransactionParams(workflow: WorkflowName): TransactionParameters {
  switch (workflow) {
    case WorkflowName.WALLET_DEPOSIT:
      return {
        debitAmount: 5000,
        debitCurrency: "COP",
        creditAmount: 1,
        creditCurrency: "USD",
        exchangeRate: 0.0025,
        transactionRef: "transaction-1",
        createdTimestamp: "2023-02-02T17:54:37.601Z",
        processingFees: 0.23,
        nobaFees: 0.34,
        totalFees: 0.57,
      };

    case WorkflowName.WALLET_WITHDRAWAL:
      return {
        debitAmount: 1,
        debitCurrency: "USD",
        creditAmount: 5000,
        creditCurrency: "COP",
        exchangeRate: 5000,
        transactionRef: "transaction-1",
        createdTimestamp: "2023-02-02T17:54:37.601Z",
        processingFees: 0.23,
        nobaFees: 0.34,
        totalFees: 0.57,
      };
    case WorkflowName.WALLET_TRANSFER:
      return {
        debitAmount: 10,
        debitCurrency: "USD",
        creditAmount: 9.43,
        creditCurrency: "USD",
        exchangeRate: 0.0025,
        transactionRef: "transaction-1",
        createdTimestamp: "2023-02-02T17:54:37.601Z",
        processingFees: 0.23,
        nobaFees: 0.34,
        totalFees: 0.57,
      };
    case WorkflowName.PAYROLL_DEPOSIT:
      return {
        debitAmount: 5000,
        debitCurrency: "COP",
        creditAmount: 1,
        creditCurrency: "USD",
        exchangeRate: 0.0025,
        transactionRef: "transaction-1",
        createdTimestamp: "2023-02-02T17:54:37.601Z",
        processingFees: 0.23,
        nobaFees: 0.34,
        totalFees: 0.57,
      };
  }
}
