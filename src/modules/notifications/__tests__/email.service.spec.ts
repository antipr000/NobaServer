import { TestingModule, Test } from "@nestjs/testing";
import { getTestWinstonModule } from "../../../core/utils/WinstonModule";
import { TestConfigModule } from "../../../core/utils/AppConfigModule";
import { instance, when } from "ts-mockito";
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
import { SendTransactionInitiatedEvent } from "../events/SendTransactionInitiatedEvent";
import { SendCryptoFailedEvent } from "../events/SendCryptoFailedEvent";
import { SendOrderExecutedEvent } from "../events/SendOrderExecutedEvent";
import { SendOrderFailedEvent } from "../events/SendOrderFailedEvent";
import { SendHardDeclineEvent } from "../events/SendHardDeclineEvent";
import sgMail, { ClientResponse } from "@sendgrid/mail";
import { EmailService } from "../email.service";
import { CurrencyService } from "../../../modules/common/currency.service";
import { getMockCurrencyServiceWithDefaults } from "../../../modules/common/mocks/mock.currency.service";
import { EmailTemplates } from "../domain/EmailTemplates";
import { Utils } from "../../../core/utils/Utils";
import { TransactionStatus } from "../../../modules/transactions/domain/Types";

jest.mock("@sendgrid/mail");
const mockedSgMail = sgMail as jest.Mocked<typeof sgMail>;

describe("ConfigurationsProviderService", () => {
  let currencyService: CurrencyService;
  let emailService: EmailService;
  const SUPPORT_URL = "help.noba.com";
  const SENDER_EMAIL = "Noba <no-reply@noba.com>";
  const NOBA_COMPLIANCE_EMAIL = "Noba Compliance <compliance@noba.com>";
  const CLIENT_RESPONSE: ClientResponse = {} as any;

  jest.setTimeout(30000);

  beforeEach(async () => {
    currencyService = getMockCurrencyServiceWithDefaults();

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
        EmailService,
        {
          provide: CurrencyService,
          useFactory: () => instance(currencyService),
        },
      ],
    }).compile();

    emailService = app.get<EmailService>(EmailService);
  });

  afterEach(() => {
    mockedSgMail.send.mockClear();
  });

  it("should call emailService with SendOtp event", async () => {
    const payload = new SendOtpEvent({
      email: "fake+user@noba.com",
      otp: "123456",
      name: "Fake",
      partnerID: "fake-partner-1234",
    });

    mockedSgMail.send.mockResolvedValueOnce([CLIENT_RESPONSE, {}]);

    await emailService.sendOtp(payload);

    expect(mockedSgMail.send).toHaveBeenCalledWith({
      to: payload.email,
      from: SENDER_EMAIL,
      templateId: EmailTemplates.OTP_EMAIL, //this is template id for sending otp without any context, see sendgrid dashboard
      dynamicTemplateData: {
        user: payload.name ?? "",
        user_email: payload.email,
        one_time_password: payload.otp,
      },
    });
  });

  it("should call emailService with SendWalletUpdateVerificationCode event", async () => {
    const payload = new SendWalletUpdateVerificationCodeEvent({
      email: "fake+user@noba.com",
      otp: "123456",
      name: "Fake",
      partnerID: "fake-partner-1234",
      walletAddress: "fake-wallet",
      partnerUserID: "fake-partner-user-id",
      nobaUserID: "fake-noba-user-id",
    });

    mockedSgMail.send.mockResolvedValueOnce([CLIENT_RESPONSE, {}]);

    await emailService.sendWalletUpdateVerificationCode(payload);

    expect(mockedSgMail.send).toHaveBeenCalledWith({
      to: payload.email,
      from: SENDER_EMAIL,
      templateId: EmailTemplates.WALLET_UPDATE_OTP,
      dynamicTemplateData: {
        user: payload.name ?? "",
        user_email: payload.email,
        one_time_password: payload.otp,
        wallet_address: payload.walletAddress,
      },
    });
  });

  it("should call emailService with SendWelcomeMessage event", async () => {
    const payload = new SendWelcomeMessageEvent({
      email: "fake+user@noba.com",
      firstName: "Fake",
      lastName: "Name",
      partnerID: "fake-partner-1234",
      partnerUserID: "fake-partner-user-id",
      nobaUserID: "fake-noba-user-id",
    });
    mockedSgMail.send.mockResolvedValueOnce([CLIENT_RESPONSE, {}]);

    await emailService.sendWelcomeMessage(payload);
    expect(mockedSgMail.send).toHaveBeenCalledWith({
      to: payload.email,
      from: SENDER_EMAIL,
      templateId: EmailTemplates.WELCOME_EMAIL,
      dynamicTemplateData: {
        user_email: payload.email,
        username: Utils.getUsernameFromNameParts(payload.firstName, payload.lastName),
      },
    });
  });

  it("should call emailService with SendKycApprovedUS event", async () => {
    const payload = new SendKycApprovedUSEvent({
      email: "fake+user@noba.com",
      firstName: "Fake",
      lastName: "Name",
      partnerID: "fake-partner-1234",
      partnerUserID: "fake-partner-user-id",
      nobaUserID: "fake-noba-user-id",
    });

    mockedSgMail.send.mockResolvedValueOnce([CLIENT_RESPONSE, {}]);

    await emailService.sendKycApprovedUSEmail(payload);
    expect(mockedSgMail.send).toHaveBeenCalledWith({
      to: payload.email,
      from: SENDER_EMAIL,
      templateId: EmailTemplates.ID_VERIFICATION_SUCCESSFUL_US_EMAIL,
      dynamicTemplateData: {
        user_email: payload.email,
        username: Utils.getUsernameFromNameParts(payload.firstName, payload.lastName),
      },
    });
  });

  it("should call emailService with SendKycApprovedNonUS event", async () => {
    const payload = new SendKycApprovedNonUSEvent({
      email: "fake+user@noba.com",
      firstName: "Fake",
      lastName: "Name",
      partnerID: "fake-partner-1234",
      partnerUserID: "fake-partner-user-id",
      nobaUserID: "fake-noba-user-id",
    });

    mockedSgMail.send.mockResolvedValueOnce([CLIENT_RESPONSE, {}]);

    await emailService.sendKycApprovedNonUSEmail(payload);

    expect(mockedSgMail.send).toHaveBeenCalledWith({
      to: payload.email,
      from: SENDER_EMAIL,
      templateId: EmailTemplates.ID_VERIFICATION_SUCCESSFUL_NON_US_EMAIL,
      dynamicTemplateData: {
        user_email: payload.email,
        username: Utils.getUsernameFromNameParts(payload.firstName, payload.lastName),
      },
    });
  });

  it("should call emailService with SendKycDenied event", async () => {
    const payload = new SendKycDeniedEvent({
      email: "fake+user@noba.com",
      firstName: "Fake",
      lastName: "Name",
      partnerID: "fake-partner-1234",
      partnerUserID: "fake-partner-user-id",
      nobaUserID: "fake-noba-user-id",
    });

    mockedSgMail.send.mockResolvedValueOnce([CLIENT_RESPONSE, {}]);
    await emailService.sendKycDeniedEmail(payload);

    expect(mockedSgMail.send).toHaveBeenCalledWith({
      to: payload.email,
      from: SENDER_EMAIL,
      templateId: EmailTemplates.KYC_DENIED_EMAIL,
      dynamicTemplateData: {
        user_email: payload.email,
        username: Utils.getUsernameFromNameParts(payload.firstName, payload.lastName),
        duration: 2, // TODO: Remove hardcoded duration
      },
    });
  });

  it("should call emailService with SendKycPendingOrFlagged event", async () => {
    const payload = new SendKycDeniedEvent({
      email: "fake+user@noba.com",
      firstName: "Fake",
      lastName: "Name",
      partnerID: "fake-partner-1234",
      partnerUserID: "fake-partner-user-id",
      nobaUserID: "fake-noba-user-id",
    });
    mockedSgMail.send.mockResolvedValueOnce([CLIENT_RESPONSE, {}]);
    await emailService.sendKycPendingOrFlaggedEmail(payload);

    expect(mockedSgMail.send).toHaveBeenCalled();
  });

  it("should call emailService with SendDocVerificationPending event", async () => {
    const payload = new SendDocumentVerificationPendingEvent({
      email: "fake+user@noba.com",
      firstName: "Fake",
      lastName: "Name",
      partnerID: "fake-partner-1234",
      partnerUserID: "fake-partner-user-id",
      nobaUserID: "fake-noba-user-id",
    });
    mockedSgMail.send.mockResolvedValueOnce([CLIENT_RESPONSE, {}]);

    await emailService.sendDocVerificationPendingEmail(payload);

    expect(mockedSgMail.send).toHaveBeenCalledWith({
      to: payload.email,
      from: SENDER_EMAIL,
      templateId: EmailTemplates.DOC_VERIFICATION_PENDING_EMAIL,
      dynamicTemplateData: {
        user_email: payload.email,
        username: Utils.getUsernameFromNameParts(payload.firstName, payload.lastName),
      },
    });
  });

  it("should call emailService with SendDocVerificationRejected event", async () => {
    const payload = new SendDocumentVerificationRejectedEvent({
      email: "fake+user@noba.com",
      firstName: "Fake",
      lastName: "Name",
      partnerID: "fake-partner-1234",
      partnerUserID: "fake-partner-user-id",
      nobaUserID: "fake-noba-user-id",
    });

    mockedSgMail.send.mockResolvedValueOnce([CLIENT_RESPONSE, {}]);

    await emailService.sendDocVerificationRejectedEmail(payload);

    expect(mockedSgMail.send).toHaveBeenCalledWith({
      to: payload.email,
      from: SENDER_EMAIL,
      templateId: EmailTemplates.DOC_VERIFICATION_REJECTED_EMAIL,
      dynamicTemplateData: {
        user_email: payload.email,
        username: Utils.getUsernameFromNameParts(payload.firstName, payload.lastName),
      },
    });
  });

  it("should call emailService with SendDocVerificationTechnicalFailure event", async () => {
    const payload = new SendDocumentVerificationTechnicalFailureEvent({
      email: "fake+user@noba.com",
      firstName: "Fake",
      lastName: "Name",
      partnerID: "fake-partner-1234",
      partnerUserID: "fake-partner-user-id",
      nobaUserID: "fake-noba-user-id",
    });

    mockedSgMail.send.mockResolvedValueOnce([CLIENT_RESPONSE, {}]);
    await emailService.sendDocVerificationFailedTechEmail(payload);

    expect(mockedSgMail.send).toHaveBeenCalledWith({
      to: payload.email,
      from: SENDER_EMAIL,
      templateId: EmailTemplates.DOC_VERIFICATION_FAILED_TECH_EMAIL,
      dynamicTemplateData: {
        user_email: payload.email,
        username: Utils.getUsernameFromNameParts(payload.firstName, payload.lastName),
      },
    });
  });

  it("should call emailService with SendCardAdded event", async () => {
    const payload = new SendCardAddedEvent({
      email: "fake+user@noba.com",
      firstName: "Fake",
      lastName: "Name",
      partnerID: "fake-partner-1234",
      partnerUserID: "fake-partner-user-id",
      nobaUserID: "fake-noba-user-id",
      cardNetwork: "VISA",
      last4Digits: "1234",
    });

    mockedSgMail.send.mockResolvedValueOnce([CLIENT_RESPONSE, {}]);
    await emailService.sendCardAddedEmail(payload);

    expect(mockedSgMail.send).toHaveBeenCalledWith({
      to: payload.email,
      from: SENDER_EMAIL,
      templateId: EmailTemplates.CARD_ADDED_EMAIL,
      dynamicTemplateData: {
        user_email: payload.email,
        username: Utils.getUsernameFromNameParts(payload.firstName, payload.lastName),
        card_network: payload.cardNetwork,
        last_four: payload.last4Digits,
        support_url: SUPPORT_URL,
      },
    });
  });

  it("should call emailService with SendCardAdditionFailed event", async () => {
    const payload = new SendCardAdditionFailedEvent({
      email: "fake+user@noba.com",
      firstName: "Fake",
      lastName: "Name",
      partnerID: "fake-partner-1234",
      partnerUserID: "fake-partner-user-id",
      nobaUserID: "fake-noba-user-id",
      last4Digits: "1234",
    });

    mockedSgMail.send.mockResolvedValueOnce([CLIENT_RESPONSE, {}]);
    await emailService.sendCardAdditionFailedEmail(payload);

    expect(sgMail.send).toHaveBeenCalledWith({
      to: payload.email,
      from: SENDER_EMAIL,
      templateId: EmailTemplates.CARD_ADDITION_FAILED_EMAIL,
      dynamicTemplateData: {
        user_email: payload.email,
        username: Utils.getUsernameFromNameParts(payload.firstName, payload.lastName),
        last_four: payload.last4Digits,
        support_url: SUPPORT_URL,
      },
    });
  });

  it("should call emailService with SendCardDeleted event", async () => {
    const payload = new SendCardDeletedEvent({
      email: "fake+user@noba.com",
      firstName: "Fake",
      lastName: "Name",
      partnerID: "fake-partner-1234",
      partnerUserID: "fake-partner-user-id",
      nobaUserID: "fake-noba-user-id",
      cardNetwork: "VISA",
      last4Digits: "1234",
    });

    mockedSgMail.send.mockResolvedValueOnce([CLIENT_RESPONSE, {}]);
    await emailService.sendCardDeletedEmail(payload);

    expect(mockedSgMail.send).toHaveBeenCalledWith({
      to: payload.email,
      from: SENDER_EMAIL,
      templateId: EmailTemplates.CARD_DELETED_EMAIL,
      dynamicTemplateData: {
        user_email: payload.email,
        username: Utils.getUsernameFromNameParts(payload.firstName, payload.lastName),
        card_network: payload.cardNetwork,
        last_four: payload.last4Digits,
        support_url: SUPPORT_URL,
      },
    });
  });

  it("should call emailService with SendTransactionInitiated event", async () => {
    const payload = new SendTransactionInitiatedEvent({
      email: "fake+user@noba.com",
      firstName: "Fake",
      lastName: "Name",
      partnerID: "fake-partner-1234",
      partnerUserID: "fake-partner-user-id",
      nobaUserID: "fake-noba-user-id",
      params: {
        transactionID: "fake-transaction-id",
        transactionTimestamp: new Date("2010-10-10"),
        paymentMethod: "fake-pm",
        destinationWalletAddress: "fake-wallet",
        last4Digits: "1234",
        fiatCurrency: "USD",
        conversionRate: 100,
        processingFee: 2,
        networkFee: 3,
        nobaFee: 4,
        totalPrice: 50,
        cryptoAmount: 0.0123,
        cryptocurrency: "ETH",
        status: TransactionStatus.FIAT_INCOMING_INITIATED,
      },
    });

    when(currencyService.getCryptocurrency("ETH")).thenResolve({
      ticker: "ETH",
      name: "Ethereum",
      iconPath: "",
      precision: 1,
    });

    mockedSgMail.send.mockResolvedValueOnce([CLIENT_RESPONSE, {}]);
    await emailService.sendTransactionInitiatedEmail(payload);

    const subtotal =
      Utils.roundTo2DecimalNumber(payload.params.totalPrice) -
      Utils.roundTo2DecimalNumber(payload.params.processingFee) -
      Utils.roundTo2DecimalNumber(payload.params.networkFee) -
      Utils.roundTo2DecimalNumber(payload.params.nobaFee);

    expect(mockedSgMail.send).toHaveBeenCalledWith({
      to: payload.email,
      from: SENDER_EMAIL,
      templateId: EmailTemplates.TRANSACTION_INITIATED_EMAIL,
      dynamicTemplateData: {
        username: Utils.getUsernameFromNameParts(payload.firstName, payload.lastName),
        transaction_id: payload.params.transactionID,
        user_email: payload.email,
        user_id: payload.email,
        fiat_currency_code: payload.params.fiatCurrency,
        card_network: payload.params.paymentMethod,
        last_four: payload.params.last4Digits,
        order_date: payload.params.transactionTimestamp.toLocaleString(),
        subtotal: Utils.roundTo2DecimalString(subtotal),
        conversion_rate: payload.params.conversionRate,
        processing_fees: Utils.roundTo2DecimalString(payload.params.processingFee),
        network_fees: Utils.roundTo2DecimalString(payload.params.networkFee),
        noba_fee: Utils.roundTo2DecimalString(payload.params.nobaFee),
        total_price: Utils.roundTo2DecimalString(payload.params.totalPrice),
        cryptocurrency_code: payload.params.cryptocurrency,
        cryptocurrency: "Ethereum",
        crypto_expected: payload.params.cryptoAmount,
      },
    });
  });

  it("should call emailService with SendTransactionInitiated event and pass ticker itself when currencyRecord is not found", async () => {
    const payload = new SendTransactionInitiatedEvent({
      email: "fake+user@noba.com",
      firstName: "Fake",
      lastName: "Name",
      partnerID: "fake-partner-1234",
      partnerUserID: "fake-partner-user-id",
      nobaUserID: "fake-noba-user-id",
      params: {
        transactionID: "fake-transaction-id",
        transactionTimestamp: new Date("2010-10-10"),
        paymentMethod: "fake-pm",
        destinationWalletAddress: "fake-wallet",
        last4Digits: "1234",
        fiatCurrency: "USD",
        conversionRate: 100,
        processingFee: 2,
        networkFee: 3,
        nobaFee: 4,
        totalPrice: 50,
        cryptoAmount: 0.0123,
        cryptocurrency: "ETH",
        status: TransactionStatus.FIAT_INCOMING_INITIATED,
      },
    });

    when(currencyService.getCryptocurrency("ETH")).thenResolve(null);

    mockedSgMail.send.mockResolvedValueOnce([CLIENT_RESPONSE, {}]);
    await emailService.sendTransactionInitiatedEmail(payload);

    const subtotal =
      Utils.roundTo2DecimalNumber(payload.params.totalPrice) -
      Utils.roundTo2DecimalNumber(payload.params.processingFee) -
      Utils.roundTo2DecimalNumber(payload.params.networkFee) -
      Utils.roundTo2DecimalNumber(payload.params.nobaFee);

    expect(mockedSgMail.send).toHaveBeenCalledWith({
      to: payload.email,
      from: SENDER_EMAIL,
      templateId: EmailTemplates.TRANSACTION_INITIATED_EMAIL,
      dynamicTemplateData: {
        username: Utils.getUsernameFromNameParts(payload.firstName, payload.lastName),
        transaction_id: payload.params.transactionID,
        user_email: payload.email,
        user_id: payload.email,
        fiat_currency_code: payload.params.fiatCurrency,
        card_network: payload.params.paymentMethod,
        last_four: payload.params.last4Digits,
        order_date: payload.params.transactionTimestamp.toLocaleString(),
        subtotal: Utils.roundTo2DecimalString(subtotal),
        conversion_rate: payload.params.conversionRate,
        processing_fees: Utils.roundTo2DecimalString(payload.params.processingFee),
        network_fees: Utils.roundTo2DecimalString(payload.params.networkFee),
        noba_fee: Utils.roundTo2DecimalString(payload.params.nobaFee),
        total_price: Utils.roundTo2DecimalString(payload.params.totalPrice),
        cryptocurrency_code: payload.params.cryptocurrency,
        cryptocurrency: "ETH",
        crypto_expected: payload.params.cryptoAmount,
      },
    });
  });

  it("should call emailService with SendCryptoFailed event", async () => {
    const payload = new SendCryptoFailedEvent({
      email: "fake+user@noba.com",
      firstName: "Fake",
      lastName: "Name",
      partnerID: "fake-partner-1234",
      partnerUserID: "fake-partner-user-id",
      nobaUserID: "fake-noba-user-id",
      params: {
        transactionID: "fake-transaction-id",
        transactionTimestamp: new Date("2010-10-10"),
        paymentMethod: "fake-pm",
        destinationWalletAddress: "fake-wallet",
        last4Digits: "1234",
        fiatCurrency: "USD",
        conversionRate: 100,
        processingFee: 2,
        networkFee: 3,
        nobaFee: 4,
        totalPrice: 50,
        cryptoAmount: 0.0123,
        cryptocurrency: "ETH",
        status: TransactionStatus.FIAT_INCOMING_INITIATED,
        failureReason: "Failure Reason",
      },
    });

    const subtotal =
      Utils.roundTo2DecimalNumber(payload.params.totalPrice) -
      Utils.roundTo2DecimalNumber(payload.params.processingFee) -
      Utils.roundTo2DecimalNumber(payload.params.networkFee) -
      Utils.roundTo2DecimalNumber(payload.params.nobaFee);

    when(currencyService.getCryptocurrency("ETH")).thenResolve({
      ticker: "ETH",
      name: "Ethereum",
      iconPath: "",
      precision: 1,
    });

    mockedSgMail.send.mockResolvedValueOnce([CLIENT_RESPONSE, {}]);

    await emailService.sendCryptoFailedEmail(payload);

    expect(mockedSgMail.send).toHaveBeenCalledWith({
      to: payload.email,
      from: SENDER_EMAIL,
      templateId: EmailTemplates.CRYPTO_FAILED_EMAIL,
      dynamicTemplateData: {
        username: Utils.getUsernameFromNameParts(payload.firstName, payload.lastName),
        transaction_id: payload.params.transactionID,
        user_email: payload.email,
        user_id: payload.email,
        fiat_currency_code: payload.params.fiatCurrency,
        card_network: payload.params.paymentMethod,
        last_four: payload.params.last4Digits,
        order_date: payload.params.transactionTimestamp.toLocaleString(),
        cryptocurrency_code: payload.params.cryptocurrency,
        conversion_rate: payload.params.conversionRate,
        crypto_expected: payload.params.cryptoAmount,
        subtotal: Utils.roundTo2DecimalString(subtotal),
        processing_fees: Utils.roundTo2DecimalString(payload.params.processingFee),
        network_fees: Utils.roundTo2DecimalString(payload.params.networkFee),
        noba_fee: Utils.roundTo2DecimalString(payload.params.nobaFee),
        total_price: Utils.roundTo2DecimalString(payload.params.totalPrice),
        reason_failed: payload.params.failureReason,
        cryptocurrency: "Ethereum",
      },
    });
  });

  it("should call emailService with SendOrderExecuted event", async () => {
    const payload = new SendOrderExecutedEvent({
      email: "fake+user@noba.com",
      firstName: "Fake",
      lastName: "Name",
      partnerID: "fake-partner-1234",
      partnerUserID: "fake-partner-user-id",
      nobaUserID: "fake-noba-user-id",
      params: {
        transactionID: "fake-transaction-id",
        transactionTimestamp: new Date("2010-10-10"),
        paymentMethod: "fake-pm",
        destinationWalletAddress: "fake-wallet",
        last4Digits: "1234",
        fiatCurrency: "USD",
        conversionRate: 100,
        processingFee: 2,
        networkFee: 3,
        nobaFee: 4,
        totalPrice: 50,
        cryptoAmount: 0.0123,
        cryptocurrency: "ETH",
        status: TransactionStatus.FIAT_INCOMING_INITIATED,
        transactionHash: "fake-hash",
        settledTimestamp: new Date("2010-10-10"),
        cryptoAmountExpected: 0.0122,
      },
    });

    when(currencyService.getCryptocurrency("ETH")).thenResolve({
      ticker: "ETH",
      name: "Ethereum",
      iconPath: "",
      precision: 1,
    });

    mockedSgMail.send.mockResolvedValueOnce([CLIENT_RESPONSE, {}]);

    await emailService.sendOrderExecutedEmail(payload);
    const subtotal =
      Utils.roundTo2DecimalNumber(payload.params.totalPrice) -
      Utils.roundTo2DecimalNumber(payload.params.processingFee) -
      Utils.roundTo2DecimalNumber(payload.params.networkFee) -
      Utils.roundTo2DecimalNumber(payload.params.nobaFee);

    expect(sgMail.send).toHaveBeenCalledWith({
      to: payload.email,
      from: SENDER_EMAIL,
      templateId: EmailTemplates.ORDER_EXECUTED_EMAIL,
      dynamicTemplateData: {
        username: Utils.getUsernameFromNameParts(payload.firstName, payload.lastName),
        transaction_id: payload.params.transactionID,
        user_email: payload.email,
        user_id: payload.email,
        transaction_hash: payload.params.transactionHash,
        fiat_currency_code: payload.params.fiatCurrency,
        card_network: payload.params.paymentMethod,
        last_four: payload.params.last4Digits,
        order_date: payload.params.transactionTimestamp.toLocaleString(),
        settled_timestamp: payload.params.settledTimestamp.toLocaleString(),
        subtotal: Utils.roundTo2DecimalString(subtotal),
        conversion_rate: payload.params.conversionRate,
        processing_fees: Utils.roundTo2DecimalString(payload.params.processingFee),
        network_fees: Utils.roundTo2DecimalString(payload.params.networkFee),
        noba_fee: Utils.roundTo2DecimalString(payload.params.nobaFee),
        total_price: Utils.roundTo2DecimalString(payload.params.totalPrice),
        cryptocurrency_code: payload.params.cryptocurrency,
        cryptocurrency: "Ethereum",
        crypto_received: payload.params.cryptoAmount,
        crypto_expected: payload.params.cryptoAmountExpected,
      },
    });
  });

  it("should call emailService with SendOrderFailed event", async () => {
    const payload = new SendOrderFailedEvent({
      email: "fake+user@noba.com",
      firstName: "Fake",
      lastName: "Name",
      partnerID: "fake-partner-1234",
      partnerUserID: "fake-partner-user-id",
      nobaUserID: "fake-noba-user-id",
      params: {
        transactionID: "fake-transaction-id",
        transactionTimestamp: new Date("2010-10-10"),
        paymentMethod: "fake-pm",
        destinationWalletAddress: "fake-wallet",
        last4Digits: "1234",
        fiatCurrency: "USD",
        conversionRate: 100,
        processingFee: 2,
        networkFee: 3,
        nobaFee: 4,
        totalPrice: 50,
        cryptoAmount: 0.0123,
        cryptocurrency: "ETH",
        status: TransactionStatus.FIAT_INCOMING_INITIATED,
        failureReason: "Failure Reason",
      },
    });

    when(currencyService.getCryptocurrency("ETH")).thenResolve({
      ticker: "ETH",
      name: "Ethereum",
      iconPath: "",
      precision: 1,
    });

    mockedSgMail.send.mockResolvedValueOnce([CLIENT_RESPONSE, {}]);

    await emailService.sendOrderFailedEmail(payload);
    const subtotal =
      Utils.roundTo2DecimalNumber(payload.params.totalPrice) -
      Utils.roundTo2DecimalNumber(payload.params.processingFee) -
      Utils.roundTo2DecimalNumber(payload.params.networkFee) -
      Utils.roundTo2DecimalNumber(payload.params.nobaFee);

    expect(mockedSgMail.send).toHaveBeenCalledWith({
      to: payload.email,
      from: SENDER_EMAIL,
      templateId: EmailTemplates.ORDER_FAILED_EMAIL,
      dynamicTemplateData: {
        username: Utils.getUsernameFromNameParts(payload.firstName, payload.lastName),
        transaction_id: payload.params.transactionID,
        user_id: payload.email,
        user_email: payload.email,
        fiat_currency_code: payload.params.fiatCurrency,
        card_network: payload.params.paymentMethod,
        last_four: payload.params.last4Digits,
        order_date: payload.params.transactionTimestamp.toLocaleString(),
        subtotal: Utils.roundTo2DecimalString(subtotal),
        conversion_rate: payload.params.conversionRate,
        processing_fees: Utils.roundTo2DecimalString(payload.params.processingFee),
        network_fees: Utils.roundTo2DecimalString(payload.params.networkFee),
        noba_fee: Utils.roundTo2DecimalString(payload.params.nobaFee),
        total_price: Utils.roundTo2DecimalString(payload.params.totalPrice),
        cryptocurrency_code: payload.params.cryptocurrency,
        cryptocurrency: "Ethereum",
        crypto_expected: payload.params.cryptoAmount,
        reason_declined: payload.params.failureReason,
      },
    });
  });

  it("should call emailService with SendHardDecline event", async () => {
    const payload = new SendHardDeclineEvent({
      email: "fake+user@noba.com",
      firstName: "Fake",
      lastName: "Name",
      partnerID: "fake-partner-1234",
      partnerUserID: "fake-partner-user-id",
      nobaUserID: "fake-noba-user-id",
      sessionID: "fake-session-id",
      transactionID: "fake-transaction-id",
      paymentToken: "fake-payment-token",
      responseCode: "fakeResponseCode",
      responseSummary: "Fake Summary",
      processor: "Checkout",
    });

    mockedSgMail.send.mockResolvedValueOnce([CLIENT_RESPONSE, {}]);

    await emailService.sendHardDeclineEmail(payload);

    expect(mockedSgMail.send).toHaveBeenCalledWith({
      to: NOBA_COMPLIANCE_EMAIL,
      from: SENDER_EMAIL,
      templateId: EmailTemplates.NOBA_INTERNAL_HARD_DECLINE,
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
