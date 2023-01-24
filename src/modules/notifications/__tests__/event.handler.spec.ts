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
import { EmailService } from "../emails/email.service";
import { EventHandler } from "../event.handler";
import { getMockEmailServiceWithDefaults } from "../mocks/mock.email.service";
import { SendDepositCompletedEvent } from "../events/SendDepositCompletedEvent";
import { SendDepositFailedEvent } from "../events/SendDepositFailedEvent";
import { SendDepositInitiatedEvent } from "../events/SendDepositInitiatedEvent";
import { SendWithdrawalCompletedEvent } from "../events/SendWithdrawalCompletedEvent";
import { SendWithdrawalInitiatedEvent } from "../events/SendWithdrawalInitiatedEvent";
import { TransactionParameters } from "../domain/TransactionNotificationParameters";
import { SendWithdrawalFailedEvent } from "../events/SendWithdrawalFailedEvent";
import { SendTransferCompletedEvent } from "../events/SendTransferCompletedEvent";
import { SendCollectionCompletedEvent } from "../events/SendCollectionCompletedEvent";

describe("EventHandlerService", () => {
  let currencyService: CurrencyService;
  let emailService: EmailService;
  let eventHandler: EventHandler;

  const SUPPORT_URL = "help.noba.com";
  const SENDER_EMAIL = "Noba <no-reply@noba.com>";
  const NOBA_COMPLIANCE_EMAIL = "Noba Compliance <compliance@noba.com>";

  jest.setTimeout(30000);

  beforeEach(async () => {
    currencyService = getMockCurrencyServiceWithDefaults();
    emailService = getMockEmailServiceWithDefaults();

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
        {
          provide: CurrencyService,
          useFactory: () => instance(currencyService),
        },
        {
          provide: "EmailService",
          useFactory: () => instance(emailService),
        },
        EventHandler,
      ],
    }).compile();

    eventHandler = app.get<EventHandler>(EventHandler);
    when(emailService.sendEmail(anything())).thenResolve();
  });

  it("should call emailService with SendOtp event", async () => {
    const payload = new SendOtpEvent({
      email: "fake+user@noba.com",
      locale: "en",
      otp: "123456",
      name: "Fake",
      handle: "fake-handle",
    });

    await eventHandler.sendOtp(payload);

    const [emailRequest] = capture(emailService.sendEmail).last();
    expect(emailRequest).toStrictEqual({
      to: payload.email,
      from: SENDER_EMAIL,
      templateId: EmailTemplates.OTP_EMAIL["en"], //this is template id for sending otp without any context, see sendgrid dashboard
      dynamicTemplateData: {
        user: payload.name ?? "",
        user_email: payload.email,
        one_time_password: payload.otp,
      },
    });
  });

  it("should call eventHandler with SendWalletUpdateVerificationCode event", async () => {
    const payload = new SendWalletUpdateVerificationCodeEvent({
      email: "fake+user@noba.com",
      locale: "en",
      otp: "123456",
      name: "Fake",

      walletAddress: "fake-wallet",

      nobaUserID: "fake-noba-user-id",
    });

    await eventHandler.sendWalletUpdateVerificationCode(payload);

    const [emailRequest] = capture(emailService.sendEmail).last();
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

  it("should call eventHandler with SendWelcomeMessage event", async () => {
    const payload = new SendWelcomeMessageEvent({
      email: "fake+user@noba.com",
      firstName: "Fake",
      lastName: "Name",
      locale: "en",
      nobaUserID: "fake-noba-user-id",
    });

    await eventHandler.sendWelcomeMessage(payload);

    const [emailRequest] = capture(emailService.sendEmail).last();
    expect(emailRequest).toStrictEqual({
      to: payload.email,
      from: SENDER_EMAIL,
      templateId: EmailTemplates.WELCOME_EMAIL["en"],
      dynamicTemplateData: {
        user_email: payload.email,
        username: Utils.getUsernameFromNameParts(payload.firstName, payload.lastName),
      },
    });
  });

  it("should call eventHandler with SendKycApprovedUS event", async () => {
    const payload = new SendKycApprovedUSEvent({
      email: "fake+user@noba.com",
      firstName: "Fake",
      lastName: "Name",
      locale: "en",
      nobaUserID: "fake-noba-user-id",
    });

    await eventHandler.sendKycApprovedUSEmail(payload);

    const [emailRequest] = capture(emailService.sendEmail).last();
    expect(emailRequest).toStrictEqual({
      to: payload.email,
      from: SENDER_EMAIL,
      templateId: EmailTemplates.ID_VERIFICATION_SUCCESSFUL_US_EMAIL["en"],
      dynamicTemplateData: {
        user_email: payload.email,
        username: Utils.getUsernameFromNameParts(payload.firstName, payload.lastName),
      },
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

    const [emailRequest] = capture(emailService.sendEmail).last();
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

  it("should call eventHandler with SendKycDenied event", async () => {
    const payload = new SendKycDeniedEvent({
      email: "fake+user@noba.com",
      firstName: "Fake",
      lastName: "Name",
      locale: "en",
      nobaUserID: "fake-noba-user-id",
    });
    await eventHandler.sendKycDeniedEmail(payload);

    const [emailRequest] = capture(emailService.sendEmail).last();
    expect(emailRequest).toStrictEqual({
      to: payload.email,
      from: SENDER_EMAIL,
      templateId: EmailTemplates.KYC_DENIED_EMAIL["en"],
      dynamicTemplateData: {
        user_email: payload.email,
        username: Utils.getUsernameFromNameParts(payload.firstName, payload.lastName),
        duration: 2, // TODO: Remove hardcoded duration
      },
    });
  });

  it("should call eventHandler with SendKycPendingOrFlagged event", async () => {
    const payload = new SendKycDeniedEvent({
      email: "fake+user@noba.com",
      firstName: "Fake",
      lastName: "Name",
      locale: "en",
      nobaUserID: "fake-noba-user-id",
    });
    await eventHandler.sendKycPendingOrFlaggedEmail(payload);

    const [emailRequest] = capture(emailService.sendEmail).last();
    expect(emailRequest).toStrictEqual;
  });

  it("should call eventHandler with SendDocVerificationPending event", async () => {
    const payload = new SendDocumentVerificationPendingEvent({
      email: "fake+user@noba.com",
      firstName: "Fake",
      lastName: "Name",
      locale: "en",
      nobaUserID: "fake-noba-user-id",
    });

    await eventHandler.sendDocVerificationPendingEmail(payload);

    const [emailRequest] = capture(emailService.sendEmail).last();
    expect(emailRequest).toStrictEqual({
      to: payload.email,
      from: SENDER_EMAIL,
      templateId: EmailTemplates.DOC_VERIFICATION_PENDING_EMAIL["en"],
      dynamicTemplateData: {
        user_email: payload.email,
        username: Utils.getUsernameFromNameParts(payload.firstName, payload.lastName),
      },
    });
  });

  it("should call eventHandler with SendDocVerificationRejected event", async () => {
    const payload = new SendDocumentVerificationRejectedEvent({
      email: "fake+user@noba.com",
      firstName: "Fake",
      lastName: "Name",
      locale: "en",
      nobaUserID: "fake-noba-user-id",
    });

    await eventHandler.sendDocVerificationRejectedEmail(payload);

    const [emailRequest] = capture(emailService.sendEmail).last();
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

  it("should call eventHandler with SendDocVerificationTechnicalFailure event", async () => {
    const payload = new SendDocumentVerificationTechnicalFailureEvent({
      email: "fake+user@noba.com",
      firstName: "Fake",
      lastName: "Name",
      locale: "en",
      nobaUserID: "fake-noba-user-id",
    });
    await eventHandler.sendDocVerificationFailedTechEmail(payload);

    const [emailRequest] = capture(emailService.sendEmail).last();
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

    const [emailRequest] = capture(emailService.sendEmail).last();
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

    const [emailRequest] = capture(emailService.sendEmail).last();
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

    const [emailRequest] = capture(emailService.sendEmail).last();
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

  it("should call eventHandler with SendCollectionCompleted event", async () => {
    const payload = new SendCollectionCompletedEvent({
      email: "fake+user@noba.com",
      firstName: "Fake",
      lastName: "Name",
      locale: "en",
      nobaUserID: "fake-noba-user-id",
    });

    await eventHandler.sendCollectionCompletedEvent(payload);

    const [emailRequest] = capture(emailService.sendEmail).last();
    expect(emailRequest).toStrictEqual({
      to: payload.email,
      from: SENDER_EMAIL,
      templateId: EmailTemplates.COLLECTION_COMPLETED_EMAIL["en"],
      dynamicTemplateData: {
        user_email: payload.email,
        username: Utils.getUsernameFromNameParts(payload.firstName, payload.lastName),
      },
    });
  });

  it("should call eventHandler with SendDepositCompleted event", async () => {
    const payload = new SendDepositCompletedEvent({
      email: "fake+user@noba.com",
      name: "First",
      handle: "fake-handle",
      params: {
        ...getTransactionParams(),
        debitAmount: "USD",
        creditAmount: "COP",
        debitCurrency: 10,
        exchangeRate: 0.0025,
      },
      locale: "en",
    });

    await eventHandler.sendDepositCompletedEmail(payload);
    const subtotal =
      Utils.roundTo2DecimalNumber(payload.params.totalPrice) -
      Utils.roundTo2DecimalNumber(payload.params.processingFees) -
      Utils.roundTo2DecimalNumber(payload.params.nobaFees);

    const [emailRequest] = capture(emailService.sendEmail).last();
    expect(emailRequest).toStrictEqual({
      to: payload.email,
      from: SENDER_EMAIL,
      templateId: EmailTemplates.DEPOSIT_SUCCESSFUL_EMAIL["en"],
      dynamicTemplateData: {
        firstName: payload.name,
        debitAmount: payload.params.debitAmount,
        creditAmount: payload.params.creditAmount,
        handle: payload.handle,
        transactionRef: payload.params.transactionRef,
        createdTimestamp: payload.params.createdTimestamp,
        exchangeRate: payload.params.exchangeRate,
        subtotal: subtotal,
        fiatCurrencyCode: payload.params.fiatCurrencyCode,
        processingFees: payload.params.processingFees,
      },
    });
  });

  it("should call eventHandler with SendDepositFailed event", async () => {
    const payload = new SendDepositFailedEvent({
      email: "fake+user@noba.com",
      name: "First",
      handle: "fake-handle",
      params: {
        ...getTransactionParams(),
        debitAmount: "USD",
        creditAmount: "COP",
        debitCurrency: 10,
        exchangeRate: 0.0025,
        reasonDeclined: "Reason",
      },
      locale: "en",
    });

    await eventHandler.sendDepositFailedEmail(payload);
    const subtotal =
      Utils.roundTo2DecimalNumber(payload.params.totalPrice) -
      Utils.roundTo2DecimalNumber(payload.params.processingFees) -
      Utils.roundTo2DecimalNumber(payload.params.nobaFees);

    const [emailRequest] = capture(emailService.sendEmail).last();
    expect(emailRequest).toStrictEqual({
      to: payload.email,
      from: SENDER_EMAIL,
      templateId: EmailTemplates.DEPOSIT_FAILED_EMAIL["en"],
      dynamicTemplateData: {
        firstName: payload.name,
        totalPrice: payload.params.totalPrice,
        handle: payload.handle,
        transactionRef: payload.params.transactionRef,
        createdTimestamp: payload.params.createdTimestamp,
        exchangeRate: payload.params.exchangeRate,
        subtotal: subtotal,
        fiatCurrencyCode: payload.params.fiatCurrencyCode,
        processingFees: payload.params.processingFees,
        reasonDeclined: payload.params.reasonDeclined,
      },
    });
  });

  it("should call eventHandler with SendDepositInitiated event", async () => {
    const payload = new SendDepositInitiatedEvent({
      email: "fake+user@noba.com",
      name: "First",
      handle: "fake-handle",
      params: {
        ...getTransactionParams(),
        debitAmount: 1,
        creditAmount: 5000,
        debitCurrency: "USD",
        exchangeRate: 0.0025,
        reasonDeclined: "Reason",
      },
      locale: "en",
    });

    await eventHandler.sendDepositInitiatedEmail(payload);
    const subtotal =
      Utils.roundTo2DecimalNumber(payload.params.totalPrice) -
      Utils.roundTo2DecimalNumber(payload.params.processingFees) -
      Utils.roundTo2DecimalNumber(payload.params.nobaFees);

    const [emailRequest] = capture(emailService.sendEmail).last();
    expect(emailRequest).toStrictEqual({
      to: payload.email,
      from: SENDER_EMAIL,
      templateId: EmailTemplates.DEPOSIT_INITIATED_EMAIL["en"],
      dynamicTemplateData: {
        firstName: payload.name,
        totalPrice: payload.params.totalPrice,
        debitCurrency: payload.params.debitCurrency,
        creditAmount: payload.params.creditAmount,
        handle: payload.handle,
        transactionRef: payload.params.transactionRef,
        createdTimestamp: payload.params.createdTimestamp,
        exchangeRate: payload.params.exchangeRate,
        subtotal: subtotal,
        fiatCurrencyCode: payload.params.fiatCurrencyCode,
        processingFees: payload.params.processingFees,
        nobaFee: payload.params.nobaFees,
      },
    });
  });

  it("should call eventHandler with SendWithdrawalCompleted event", async () => {
    const payload = new SendWithdrawalCompletedEvent({
      email: "fake+user@noba.com",
      name: "First",
      handle: "fake-handle",
      params: {
        ...getTransactionParams(),
        creditAmount: 50000,
        debitCurrency: 10,
        exchangeRate: 0.0025,
      },
      locale: "en",
    });

    await eventHandler.sendWithdrawalCompletedEmail(payload);
    const subtotal =
      Utils.roundTo2DecimalNumber(payload.params.totalPrice) -
      Utils.roundTo2DecimalNumber(payload.params.processingFees) -
      Utils.roundTo2DecimalNumber(payload.params.nobaFees);

    const [emailRequest] = capture(emailService.sendEmail).last();
    expect(emailRequest).toStrictEqual({
      to: payload.email,
      from: SENDER_EMAIL,
      templateId: EmailTemplates.WITHDRAWAL_SUCCESSFUL_EMAIL["en"],
      dynamicTemplateData: {
        firstName: payload.name,
        creditAmount: payload.params.creditAmount,
        creditCurrency: payload.params.creditCurrency,
        handle: payload.handle,
        transactionRef: payload.params.transactionRef,
        createdTimestamp: payload.params.createdTimestamp,
        exchangeRate: payload.params.exchangeRate,
        subtotal: subtotal,
        fiatCurrencyCode: payload.params.fiatCurrencyCode,
        processingFees: payload.params.processingFees,
      },
    });
  });

  it("should call eventHandler with SendWithdrawalInitiated event", async () => {
    const payload = new SendWithdrawalInitiatedEvent({
      email: "fake+user@noba.com",
      name: "First",
      handle: "fake-handle",
      params: {
        ...getTransactionParams(),
        withdrawalAmount: 5000,
        creditCurrency: "COP",
        exchangeRate: 0.0025,
        debitCurrency: "USD",
      },
      locale: "en",
    });

    await eventHandler.sendWithdrawalInitiatedEmail(payload);
    const subtotal =
      Utils.roundTo2DecimalNumber(payload.params.totalPrice) -
      Utils.roundTo2DecimalNumber(payload.params.processingFees) -
      Utils.roundTo2DecimalNumber(payload.params.nobaFees);

    const [emailRequest] = capture(emailService.sendEmail).last();
    expect(emailRequest).toStrictEqual({
      to: payload.email,
      from: SENDER_EMAIL,
      templateId: EmailTemplates.WITHDRAWAL_INITIATED_EMAIL["en"],
      dynamicTemplateData: {
        firstName: payload.name,
        withdrawalAmount: payload.params.withdrawalAmount,
        creditCurrency: payload.params.creditCurrency,
        handle: payload.handle,
        transactionRef: payload.params.transactionRef,
        createdTimestamp: payload.params.createdTimestamp,
        exchangeRate: payload.params.exchangeRate,
        debitCurrency: payload.params.debitCurrency,
        subtotal: subtotal,
        fiatCurrencyCode: payload.params.fiatCurrencyCode,
        processingFees: payload.params.processingFees,
        nobaFee: payload.params.nobaFees,
        totalPrice: payload.params.totalPrice,
      },
    });
  });

  it("should call eventHandler with SendWithdrawalFailed event", async () => {
    const payload = new SendWithdrawalFailedEvent({
      email: "fake+user@noba.com",
      name: "First",
      handle: "fake-handle",
      params: {
        ...getTransactionParams(),
        exchangeRate: 0.0025,
        debitCurrency: "USD",
        reasonDeclined: "Failed",
      },
      locale: "en",
    });

    await eventHandler.sendWithdrawalFailedEmail(payload);
    const subtotal =
      Utils.roundTo2DecimalNumber(payload.params.totalPrice) -
      Utils.roundTo2DecimalNumber(payload.params.processingFees) -
      Utils.roundTo2DecimalNumber(payload.params.nobaFees);

    const [emailRequest] = capture(emailService.sendEmail).last();
    expect(emailRequest).toStrictEqual({
      to: payload.email,
      from: SENDER_EMAIL,
      templateId: EmailTemplates.WITHDRAWAL_FAILED_EMAIL["en"],
      dynamicTemplateData: {
        firstName: payload.name,
        handle: payload.handle,
        transactionRef: payload.params.transactionRef,
        createdTimestamp: payload.params.createdTimestamp,
        exchangeRate: payload.params.exchangeRate,
        debitCurrency: payload.params.debitCurrency,
        subtotal: subtotal,
        fiatCurrencyCode: payload.params.fiatCurrencyCode,
        processingFees: payload.params.processingFees,
        nobaFee: payload.params.nobaFees,
        totalPrice: payload.params.totalPrice,
        reasonDeclined: payload.params.reasonDeclined,
      },
    });
  });

  it("should call eventHandler with SendTransferCompleted event", async () => {
    const payload = new SendTransferCompletedEvent({
      email: "fake+user@noba.com",
      name: "First",
      handle: "fake-handle",
      params: {
        ...getTransactionParams(),
        debitAmount: 10,
      },
      locale: "en",
    });

    await eventHandler.sendTransferCompletedEmail(payload);

    const [emailRequest] = capture(emailService.sendEmail).last();
    expect(emailRequest).toStrictEqual({
      to: payload.email,
      from: SENDER_EMAIL,
      templateId: EmailTemplates.TRANSFER_SUCCESSFUL_EMAIL["en"],
      dynamicTemplateData: {
        firstName: payload.name,
        debitAmount: payload.params.debitAmount,
        transactionRef: payload.params.transactionRef,
        createdTimestamp: payload.params.createdTimestamp,
        processingFees: payload.params.processingFees,
        fiatCurrencyCode: payload.params.fiatCurrencyCode,
        nobaFee: payload.params.nobaFees,
        totalPrice: payload.params.totalPrice,
      },
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

    const [emailRequest] = capture(emailService.sendEmail).last();
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
});

function getTransactionParams(): TransactionParameters {
  return {
    transactionRef: "fake-transaction-ref",
    createdTimestamp: new Date("2020-01-01").toUTCString(),
    processingFees: 1,
    nobaFees: 1,
    totalPrice: 10,
    fiatCurrencyCode: "COP",
  };
}
