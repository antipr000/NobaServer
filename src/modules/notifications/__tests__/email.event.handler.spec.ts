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
import { SendCollectionCompletedEvent } from "../events/SendCollectionCompletedEvent";
import { SendEmployerRequestEvent } from "../events/SendEmployerRequestEvent";
import { WorkflowName } from "../../../modules/transaction/domain/Transaction";
import { SendTransferFailedEvent } from "../events/SendTransferFailedEvent";

describe("EmailEventHandler", () => {
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

  it("should call emailService with SendOtp event", async () => {
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

  it("should call eventHandler with SendWelcomeMessage event", async () => {
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

    const [emailRequest] = capture(emailClient.sendEmail).last();
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

  it("should call eventHandler with SendKycDenied event", async () => {
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

    const [emailRequest] = capture(emailClient.sendEmail).last();
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

    const [emailRequest] = capture(emailClient.sendEmail).last();
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

  it("should call eventHandler with SendDocVerificationTechnicalFailure event", async () => {
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

  it("should call eventHandler with SendCollectionCompleted event", async () => {
    const payload = new SendCollectionCompletedEvent({
      email: "fake+user@noba.com",
      firstName: "Fake",
      lastName: "Name",
      locale: "en",
      nobaUserID: "fake-noba-user-id",
    });

    await eventHandler.sendCollectionCompletedEvent(payload);

    const [emailRequest] = capture(emailClient.sendEmail).last();
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
      params: getTransactionParams(WorkflowName.WALLET_DEPOSIT),
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

  it("should call eventHandler with SendDepositFailed event", async () => {
    const payload = new SendDepositFailedEvent({
      email: "fake+user@noba.com",
      name: "First",
      handle: "fake-handle",
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

  it("should call eventHandler with SendDepositInitiated event", async () => {
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

  it("should call eventHandler with SendWithdrawalCompleted event", async () => {
    const payload = new SendWithdrawalCompletedEvent({
      email: "fake+user@noba.com",
      name: "First",
      handle: "fake-handle",
      params: {
        ...getTransactionParams(WorkflowName.WALLET_WITHDRAWAL),
      },
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

  it("should call eventHandler with SendWithdrawalInitiated event", async () => {
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

  it("should call eventHandler with SendWithdrawalFailed event", async () => {
    const payload = new SendWithdrawalFailedEvent({
      email: "fake+user@noba.com",
      name: "First",
      handle: "fake-handle",
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

  it("should call eventHandler with SendTransferCompleted event", async () => {
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

  it("should call eventHandler with SendTransferFailed event", async () => {
    const payload = new SendTransferFailedEvent({
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

  it("should call eventHandler with SendEmployerRequest event", async () => {
    const payload = new SendEmployerRequestEvent({
      email: "fake+user@noba.com",
      locale: "en",
    });

    await eventHandler.sendEmployerRequestEmail(payload);

    const [emailRequest] = capture(emailClient.sendEmail).last();
    expect(emailRequest).toStrictEqual({
      to: payload.email,
      from: SENDER_EMAIL,
      templateId: EmailTemplates.EMPLOYER_REQUEST_EMAIL[payload.locale],
      dynamicTemplateData: {},
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
  }
}
