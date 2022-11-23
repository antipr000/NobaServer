import axios from "axios";
import { TestingModule, Test } from "@nestjs/testing";
import { getTestWinstonModule } from "../../../core/utils/WinstonModule";
import { TestConfigModule } from "../../../core/utils/AppConfigModule";
import { deepEqual, instance, when } from "ts-mockito";
import { PartnerService } from "../../../modules/partner/partner.service";
import { getMockPartnerServiceWithDefaults } from "../../../modules/partner/mocks/mock.partner.service";
import { WebhookService } from "../webhook.service";
import { SendOtpEvent } from "../events/SendOtpEvent";
import { Partner } from "../../../modules/partner/domain/Partner";
import { WebhookType } from "../../../modules/partner/domain/WebhookTypes";
import { NotificationEventType } from "../domain/NotificationTypes";
import { SendWalletUpdateVerificationCodeEvent } from "../events/SendWalletUpdateVerificationCodeEvent";
import { SendWelcomeMessageEvent } from "../events/SendWelcomeMessageEvent";
import { SendKycApprovedUSEvent } from "../events/SendKycApprovedUSEvent";
import { KYCStatus } from "../../../modules/consumer/domain/VerificationStatus";
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

jest.mock("axios");

const mockAxios = axios as jest.Mocked<typeof axios>;

describe("WebhookService", () => {
  let partnerService: PartnerService;
  let webhookService: WebhookService;

  jest.setTimeout(30000);

  beforeEach(async () => {
    partnerService = getMockPartnerServiceWithDefaults();

    process.env = {
      ...process.env,
      NODE_ENV: "development",
    };

    const app: TestingModule = await Test.createTestingModule({
      imports: [TestConfigModule.registerAsync({}), getTestWinstonModule()],
      controllers: [],
      providers: [
        WebhookService,
        {
          provide: PartnerService,
          useFactory: () => instance(partnerService),
        },
      ],
    }).compile();

    webhookService = app.get<WebhookService>(WebhookService);
  });

  afterEach(() => {
    mockAxios.post.mockClear();
    mockAxios.all.mockClear();
  });

  it("should call webhook with SendOtp event", async () => {
    const sendOtpEvent = new SendOtpEvent({
      email: "fake+user@noba.com",
      otp: "123456",
      name: "Fake",
      partnerID: "fake-partner-1234",
    });

    const partner = createFakePartner();

    when(partnerService.getPartner(partner.props._id)).thenResolve(partner);
    when(partnerService.getWebhook(deepEqual(partner), WebhookType.NOTIFICATION)).thenReturn(partner.props.webhooks[0]);

    mockAxios.post.mockResolvedValueOnce({ data: {}, status: 200, statusText: "Ok", headers: {}, config: {} });

    await webhookService.sendOtp(sendOtpEvent);

    expect(mockAxios.post).toHaveBeenCalledWith(
      "https://fake-api.noba.com",
      {
        event: NotificationEventType.SEND_OTP_EVENT,
        userData: {
          email: sendOtpEvent.email,
          firstName: sendOtpEvent.name,
        },
        otpData: {
          otp: sendOtpEvent.otp,
        },
      },
      {
        auth: {
          username: partner.props.webhookClientID,
          password: partner.props.webhookSecret,
        },
      },
    );
  });

  it("should call webhook with SendOtp event and not throw error when call fails", async () => {
    const sendOtpEvent = new SendOtpEvent({
      email: "fake+user@noba.com",
      otp: "123456",
      name: "Fake",
      partnerID: "fake-partner-1234",
    });

    const partner = createFakePartner();

    when(partnerService.getPartner(partner.props._id)).thenResolve(partner);
    when(partnerService.getWebhook(deepEqual(partner), WebhookType.NOTIFICATION)).thenReturn(partner.props.webhooks[0]);

    mockAxios.post.mockRejectedValueOnce({
      data: {},
      status: 500,
      statusText: "InternalServerError",
      headers: {},
      config: {},
    });

    await webhookService.sendOtp(sendOtpEvent);

    expect(mockAxios.post).toHaveBeenCalledWith(
      "https://fake-api.noba.com",
      {
        event: NotificationEventType.SEND_OTP_EVENT,
        userData: {
          email: sendOtpEvent.email,
          firstName: sendOtpEvent.name,
        },
        otpData: {
          otp: sendOtpEvent.otp,
        },
      },
      {
        auth: {
          username: partner.props.webhookClientID,
          password: partner.props.webhookSecret,
        },
      },
    );
  });

  it("should call webhook with SendWalletUpdateVerificationCode event", async () => {
    const payload = new SendWalletUpdateVerificationCodeEvent({
      email: "fake+user@noba.com",
      otp: "123456",
      name: "Fake",
      partnerID: "fake-partner-1234",
      walletAddress: "fake-wallet",
      partnerUserID: "fake-partner-user-id",
      nobaUserID: "fake-noba-user-id",
    });

    const partner = createFakePartner();

    when(partnerService.getPartner(partner.props._id)).thenResolve(partner);
    when(partnerService.getWebhook(deepEqual(partner), WebhookType.NOTIFICATION)).thenReturn(partner.props.webhooks[0]);

    mockAxios.post.mockResolvedValueOnce({ data: {}, status: 200, statusText: "Ok", headers: {}, config: {} });

    await webhookService.sendWalletUpdateVerificationCode(payload);

    expect(mockAxios.post).toHaveBeenCalledWith(
      "https://fake-api.noba.com",
      {
        event: NotificationEventType.SEND_WALLET_UPDATE_VERIFICATION_CODE_EVENT,
        userData: {
          email: payload.email,
          firstName: payload.name,
        },
        otpData: {
          otp: payload.otp,
          walletAddress: payload.walletAddress,
        },
      },
      {
        auth: {
          username: partner.props.webhookClientID,
          password: partner.props.webhookSecret,
        },
      },
    );
  });

  it("should call webhook with SendWelcomeMessage event", async () => {
    const payload = new SendWelcomeMessageEvent({
      email: "fake+user@noba.com",
      firstName: "Fake",
      lastName: "Name",
      partnerID: "fake-partner-1234",
      partnerUserID: "fake-partner-user-id",
      nobaUserID: "fake-noba-user-id",
    });

    const partner = createFakePartner();

    when(partnerService.getPartner(partner.props._id)).thenResolve(partner);
    when(partnerService.getWebhook(deepEqual(partner), WebhookType.NOTIFICATION)).thenReturn(partner.props.webhooks[0]);

    mockAxios.post.mockResolvedValueOnce({ data: {}, status: 200, statusText: "Ok", headers: {}, config: {} });

    await webhookService.sendWelcomeMessage(payload);

    expect(mockAxios.post).toHaveBeenCalledWith(
      "https://fake-api.noba.com",
      {
        event: NotificationEventType.SEND_WELCOME_MESSAGE_EVENT,
        userData: {
          email: payload.email,
          firstName: payload.firstName,
          lastName: payload.lastName,
          nobaUserID: payload.nobaUserID,
        },
      },
      {
        auth: {
          username: partner.props.webhookClientID,
          password: partner.props.webhookSecret,
        },
      },
    );
  });

  it("should call webhook with SendKycApprovedUS event", async () => {
    const payload = new SendKycApprovedUSEvent({
      email: "fake+user@noba.com",
      firstName: "Fake",
      lastName: "Name",
      partnerID: "fake-partner-1234",
      partnerUserID: "fake-partner-user-id",
      nobaUserID: "fake-noba-user-id",
    });

    const partner = createFakePartner();

    when(partnerService.getPartner(partner.props._id)).thenResolve(partner);
    when(partnerService.getWebhook(deepEqual(partner), WebhookType.NOTIFICATION)).thenReturn(partner.props.webhooks[0]);

    mockAxios.post.mockResolvedValueOnce({ data: {}, status: 200, statusText: "Ok", headers: {}, config: {} });

    await webhookService.sendKycApprovedUSMessage(payload);

    expect(mockAxios.post).toHaveBeenCalledWith(
      "https://fake-api.noba.com",
      {
        event: NotificationEventType.SEND_KYC_APPROVED_US_EVENT,
        userData: {
          email: payload.email,
          firstName: payload.firstName,
          lastName: payload.lastName,
          nobaUserID: payload.nobaUserID,
        },
        verificationStatus: KYCStatus.APPROVED,
      },
      {
        auth: {
          username: partner.props.webhookClientID,
          password: partner.props.webhookSecret,
        },
      },
    );
  });

  it("should call webhook with SendKycApprovedNonUS event", async () => {
    const payload = new SendKycApprovedNonUSEvent({
      email: "fake+user@noba.com",
      firstName: "Fake",
      lastName: "Name",
      partnerID: "fake-partner-1234",
      partnerUserID: "fake-partner-user-id",
      nobaUserID: "fake-noba-user-id",
    });

    const partner = createFakePartner();

    when(partnerService.getPartner(partner.props._id)).thenResolve(partner);
    when(partnerService.getWebhook(deepEqual(partner), WebhookType.NOTIFICATION)).thenReturn(partner.props.webhooks[0]);

    mockAxios.post.mockResolvedValueOnce({ data: {}, status: 200, statusText: "Ok", headers: {}, config: {} });

    await webhookService.sendKycApprovedNonUSMessage(payload);

    expect(mockAxios.post).toHaveBeenCalledWith(
      "https://fake-api.noba.com",
      {
        event: NotificationEventType.SEND_KYC_APPROVED_NON_US_EVENT,
        userData: {
          email: payload.email,
          firstName: payload.firstName,
          lastName: payload.lastName,
          nobaUserID: payload.nobaUserID,
        },
        verificationStatus: KYCStatus.APPROVED,
      },
      {
        auth: {
          username: partner.props.webhookClientID,
          password: partner.props.webhookSecret,
        },
      },
    );
  });

  it("should call webhook with SendKycDenied event", async () => {
    const payload = new SendKycDeniedEvent({
      email: "fake+user@noba.com",
      firstName: "Fake",
      lastName: "Name",
      partnerID: "fake-partner-1234",
      partnerUserID: "fake-partner-user-id",
      nobaUserID: "fake-noba-user-id",
    });

    const partner = createFakePartner();

    when(partnerService.getPartner(partner.props._id)).thenResolve(partner);
    when(partnerService.getWebhook(deepEqual(partner), WebhookType.NOTIFICATION)).thenReturn(partner.props.webhooks[0]);

    mockAxios.post.mockResolvedValueOnce({ data: {}, status: 200, statusText: "Ok", headers: {}, config: {} });

    await webhookService.sendKycDeniedMessage(payload);

    expect(mockAxios.post).toHaveBeenCalledWith(
      "https://fake-api.noba.com",
      {
        event: NotificationEventType.SEND_KYC_DENIED_EVENT,
        userData: {
          email: payload.email,
          firstName: payload.firstName,
          lastName: payload.lastName,
          nobaUserID: payload.nobaUserID,
        },
        verificationStatus: KYCStatus.REJECTED,
      },
      {
        auth: {
          username: partner.props.webhookClientID,
          password: partner.props.webhookSecret,
        },
      },
    );
  });

  it("should call webhook with SendKycPendingOrFlagged event", async () => {
    const payload = new SendKycDeniedEvent({
      email: "fake+user@noba.com",
      firstName: "Fake",
      lastName: "Name",
      partnerID: "fake-partner-1234",
      partnerUserID: "fake-partner-user-id",
      nobaUserID: "fake-noba-user-id",
    });

    const partner = createFakePartner();

    when(partnerService.getPartner(partner.props._id)).thenResolve(partner);
    when(partnerService.getWebhook(deepEqual(partner), WebhookType.NOTIFICATION)).thenReturn(partner.props.webhooks[0]);

    mockAxios.post.mockResolvedValueOnce({ data: {}, status: 200, statusText: "Ok", headers: {}, config: {} });

    await webhookService.sendKycPendingOrFlaggedMessage(payload);

    expect(mockAxios.post).toHaveBeenCalledWith(
      "https://fake-api.noba.com",
      {
        event: NotificationEventType.SEND_KYC_PENDING_OR_FLAGGED_EVENT,
        userData: {
          email: payload.email,
          firstName: payload.firstName,
          lastName: payload.lastName,
          nobaUserID: payload.nobaUserID,
        },
        verificationStatus: KYCStatus.PENDING,
      },
      {
        auth: {
          username: partner.props.webhookClientID,
          password: partner.props.webhookSecret,
        },
      },
    );
  });

  it("should call webhook with SendDocVerificationPending event", async () => {
    const payload = new SendDocumentVerificationPendingEvent({
      email: "fake+user@noba.com",
      firstName: "Fake",
      lastName: "Name",
      partnerID: "fake-partner-1234",
      partnerUserID: "fake-partner-user-id",
      nobaUserID: "fake-noba-user-id",
    });

    const partner = createFakePartner();

    when(partnerService.getPartner(partner.props._id)).thenResolve(partner);
    when(partnerService.getWebhook(deepEqual(partner), WebhookType.NOTIFICATION)).thenReturn(partner.props.webhooks[0]);

    mockAxios.post.mockResolvedValueOnce({ data: {}, status: 200, statusText: "Ok", headers: {}, config: {} });

    await webhookService.sendDocVerificationPendingMessage(payload);

    expect(mockAxios.post).toHaveBeenCalledWith(
      "https://fake-api.noba.com",
      {
        event: NotificationEventType.SEND_DOCUMENT_VERIFICATION_PENDING_EVENT,
        userData: {
          email: payload.email,
          firstName: payload.firstName,
          lastName: payload.lastName,
          nobaUserID: payload.nobaUserID,
        },
        verificationStatus: KYCStatus.PENDING,
      },
      {
        auth: {
          username: partner.props.webhookClientID,
          password: partner.props.webhookSecret,
        },
      },
    );
  });

  it("should call webhook with SendDocVerificationRejected event", async () => {
    const payload = new SendDocumentVerificationRejectedEvent({
      email: "fake+user@noba.com",
      firstName: "Fake",
      lastName: "Name",
      partnerID: "fake-partner-1234",
      partnerUserID: "fake-partner-user-id",
      nobaUserID: "fake-noba-user-id",
    });

    const partner = createFakePartner();

    when(partnerService.getPartner(partner.props._id)).thenResolve(partner);
    when(partnerService.getWebhook(deepEqual(partner), WebhookType.NOTIFICATION)).thenReturn(partner.props.webhooks[0]);

    mockAxios.post.mockResolvedValueOnce({ data: {}, status: 200, statusText: "Ok", headers: {}, config: {} });

    await webhookService.sendDocVerificationRejectedMessage(payload);

    expect(mockAxios.post).toHaveBeenCalledWith(
      "https://fake-api.noba.com",
      {
        event: NotificationEventType.SEND_DOCUMENT_VERIFICATION_REJECTED_EVENT,
        userData: {
          email: payload.email,
          firstName: payload.firstName,
          lastName: payload.lastName,
          nobaUserID: payload.nobaUserID,
        },
        verificationStatus: KYCStatus.REJECTED,
      },
      {
        auth: {
          username: partner.props.webhookClientID,
          password: partner.props.webhookSecret,
        },
      },
    );
  });

  it("should call webhook with SendDocVerificationTechnicalFailure event", async () => {
    const payload = new SendDocumentVerificationTechnicalFailureEvent({
      email: "fake+user@noba.com",
      firstName: "Fake",
      lastName: "Name",
      partnerID: "fake-partner-1234",
      partnerUserID: "fake-partner-user-id",
      nobaUserID: "fake-noba-user-id",
    });

    const partner = createFakePartner();

    when(partnerService.getPartner(partner.props._id)).thenResolve(partner);
    when(partnerService.getWebhook(deepEqual(partner), WebhookType.NOTIFICATION)).thenReturn(partner.props.webhooks[0]);

    mockAxios.post.mockResolvedValueOnce({ data: {}, status: 200, statusText: "Ok", headers: {}, config: {} });

    await webhookService.sendDocVerificationFailedTechMessage(payload);

    expect(mockAxios.post).toHaveBeenCalledWith(
      "https://fake-api.noba.com",
      {
        event: NotificationEventType.SEND_DOCUMENT_VERIFICATION_TECHNICAL_FAILURE_EVENT,
        userData: {
          email: payload.email,
          firstName: payload.firstName,
          lastName: payload.lastName,
          nobaUserID: payload.nobaUserID,
        },
      },
      {
        auth: {
          username: partner.props.webhookClientID,
          password: partner.props.webhookSecret,
        },
      },
    );
  });

  it("should call webhook with SendCardAdded event", async () => {
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

    const partner = createFakePartner();

    when(partnerService.getPartner(partner.props._id)).thenResolve(partner);
    when(partnerService.getWebhook(deepEqual(partner), WebhookType.NOTIFICATION)).thenReturn(partner.props.webhooks[0]);

    mockAxios.post.mockResolvedValueOnce({ data: {}, status: 200, statusText: "Ok", headers: {}, config: {} });

    await webhookService.sendCardAddedMessage(payload);

    expect(mockAxios.post).toHaveBeenCalledWith(
      "https://fake-api.noba.com",
      {
        event: NotificationEventType.SEND_CARD_ADDED_EVENT,
        userData: {
          email: payload.email,
          firstName: payload.firstName,
          lastName: payload.lastName,
          nobaUserID: payload.nobaUserID,
        },
        paymentMethodInformation: {
          last4Digits: payload.last4Digits,
          cardNetwork: payload.cardNetwork,
        },
      },
      {
        auth: {
          username: partner.props.webhookClientID,
          password: partner.props.webhookSecret,
        },
      },
    );
  });

  it("should call webhook with SendCardAdditionFailed event", async () => {
    const payload = new SendCardAdditionFailedEvent({
      email: "fake+user@noba.com",
      firstName: "Fake",
      lastName: "Name",
      partnerID: "fake-partner-1234",
      partnerUserID: "fake-partner-user-id",
      nobaUserID: "fake-noba-user-id",
      last4Digits: "1234",
    });

    const partner = createFakePartner();

    when(partnerService.getPartner(partner.props._id)).thenResolve(partner);
    when(partnerService.getWebhook(deepEqual(partner), WebhookType.NOTIFICATION)).thenReturn(partner.props.webhooks[0]);

    mockAxios.post.mockResolvedValueOnce({ data: {}, status: 200, statusText: "Ok", headers: {}, config: {} });

    await webhookService.sendCardAdditionFailedMessage(payload);

    expect(mockAxios.post).toHaveBeenCalledWith(
      "https://fake-api.noba.com",
      {
        event: NotificationEventType.SEND_CARD_ADDITION_FAILED_EVENT,
        userData: {
          email: payload.email,
          firstName: payload.firstName,
          lastName: payload.lastName,
          nobaUserID: payload.nobaUserID,
        },
        paymentMethodInformation: {
          last4Digits: payload.last4Digits,
        },
      },
      {
        auth: {
          username: partner.props.webhookClientID,
          password: partner.props.webhookSecret,
        },
      },
    );
  });

  it("should call webhook with SendCardDeleted event", async () => {
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

    const partner = createFakePartner();

    when(partnerService.getPartner(partner.props._id)).thenResolve(partner);
    when(partnerService.getWebhook(deepEqual(partner), WebhookType.NOTIFICATION)).thenReturn(partner.props.webhooks[0]);

    mockAxios.post.mockResolvedValueOnce({ data: {}, status: 200, statusText: "Ok", headers: {}, config: {} });

    await webhookService.sendCardDeletedMessage(payload);

    expect(mockAxios.post).toHaveBeenCalledWith(
      "https://fake-api.noba.com",
      {
        event: NotificationEventType.SEND_CARD_DELETED_EVENT,
        userData: {
          email: payload.email,
          firstName: payload.firstName,
          lastName: payload.lastName,
          nobaUserID: payload.nobaUserID,
        },
        paymentMethodInformation: {
          last4Digits: payload.last4Digits,
          cardNetwork: payload.cardNetwork,
        },
      },
      {
        auth: {
          username: partner.props.webhookClientID,
          password: partner.props.webhookSecret,
        },
      },
    );
  });

  it("should call webhook with SendTransactionInitiated event", async () => {
    const payload = new SendTransactionInitiatedEvent({
      email: "fake+user@noba.com",
      firstName: "Fake",
      lastName: "Name",
      partnerID: "fake-partner-1234",
      partnerUserID: "fake-partner-user-id",
      nobaUserID: "fake-noba-user-id",
      params: {} as any,
    });

    const partner = createFakePartner();

    when(partnerService.getPartner(partner.props._id)).thenResolve(partner);
    when(partnerService.getWebhook(deepEqual(partner), WebhookType.NOTIFICATION)).thenReturn(partner.props.webhooks[0]);

    mockAxios.post.mockResolvedValueOnce({ data: {}, status: 200, statusText: "Ok", headers: {}, config: {} });

    await webhookService.sendTransactionInitiatedMessage(payload);

    expect(mockAxios.post).toHaveBeenCalledWith(
      "https://fake-api.noba.com",
      {
        event: NotificationEventType.SEND_TRANSACTION_INITIATED_EVENT,
        userData: {
          email: payload.email,
          firstName: payload.firstName,
          lastName: payload.lastName,
          nobaUserID: payload.nobaUserID,
        },
        transactionInformation: {
          ...payload.params,
        },
      },
      {
        auth: {
          username: partner.props.webhookClientID,
          password: partner.props.webhookSecret,
        },
      },
    );
  });

  it("should call webhook with SendCryptoFailed event", async () => {
    const payload = new SendCryptoFailedEvent({
      email: "fake+user@noba.com",
      firstName: "Fake",
      lastName: "Name",
      partnerID: "fake-partner-1234",
      partnerUserID: "fake-partner-user-id",
      nobaUserID: "fake-noba-user-id",
      params: {} as any,
    });

    const partner = createFakePartner();

    when(partnerService.getPartner(partner.props._id)).thenResolve(partner);
    when(partnerService.getWebhook(deepEqual(partner), WebhookType.NOTIFICATION)).thenReturn(partner.props.webhooks[0]);

    mockAxios.post.mockResolvedValueOnce({ data: {}, status: 200, statusText: "Ok", headers: {}, config: {} });

    await webhookService.sendCryptoFailedMessage(payload);

    expect(mockAxios.post).toHaveBeenCalledWith(
      "https://fake-api.noba.com",
      {
        event: NotificationEventType.SEND_CRYPTO_FAILED_EVENT,
        userData: {
          email: payload.email,
          firstName: payload.firstName,
          lastName: payload.lastName,
          nobaUserID: payload.nobaUserID,
        },
        transactionInformation: {
          ...payload.params,
        },
      },
      {
        auth: {
          username: partner.props.webhookClientID,
          password: partner.props.webhookSecret,
        },
      },
    );
  });

  it("should call webhook with SendOrderExecuted event", async () => {
    const payload = new SendOrderExecutedEvent({
      email: "fake+user@noba.com",
      firstName: "Fake",
      lastName: "Name",
      partnerID: "fake-partner-1234",
      partnerUserID: "fake-partner-user-id",
      nobaUserID: "fake-noba-user-id",
      params: {} as any,
    });

    const partner = createFakePartner();

    when(partnerService.getPartner(partner.props._id)).thenResolve(partner);
    when(partnerService.getWebhook(deepEqual(partner), WebhookType.NOTIFICATION)).thenReturn(partner.props.webhooks[0]);

    mockAxios.post.mockResolvedValueOnce({ data: {}, status: 200, statusText: "Ok", headers: {}, config: {} });

    await webhookService.sendOrderExecutedMessage(payload);

    expect(mockAxios.post).toHaveBeenCalledWith(
      "https://fake-api.noba.com",
      {
        event: NotificationEventType.SEND_TRANSACTION_COMPLETED_EVENT,
        userData: {
          email: payload.email,
          firstName: payload.firstName,
          lastName: payload.lastName,
          nobaUserID: payload.nobaUserID,
        },
        transactionInformation: {
          ...payload.params,
        },
      },
      {
        auth: {
          username: partner.props.webhookClientID,
          password: partner.props.webhookSecret,
        },
      },
    );
  });

  it("should call webhook with SendOrderFailed event", async () => {
    const payload = new SendOrderFailedEvent({
      email: "fake+user@noba.com",
      firstName: "Fake",
      lastName: "Name",
      partnerID: "fake-partner-1234",
      partnerUserID: "fake-partner-user-id",
      nobaUserID: "fake-noba-user-id",
      params: {} as any,
    });

    const partner = createFakePartner();

    when(partnerService.getPartner(partner.props._id)).thenResolve(partner);
    when(partnerService.getWebhook(deepEqual(partner), WebhookType.NOTIFICATION)).thenReturn(partner.props.webhooks[0]);

    mockAxios.post.mockResolvedValueOnce({ data: {}, status: 200, statusText: "Ok", headers: {}, config: {} });

    await webhookService.sendOrderFailedMessage(payload);

    expect(mockAxios.post).toHaveBeenCalledWith(
      "https://fake-api.noba.com",
      {
        event: NotificationEventType.SEND_TRANSACTION_FAILED_EVENT,
        userData: {
          email: payload.email,
          firstName: payload.firstName,
          lastName: payload.lastName,
          nobaUserID: payload.nobaUserID,
        },
        transactionInformation: {
          ...payload.params,
        },
      },
      {
        auth: {
          username: partner.props.webhookClientID,
          password: partner.props.webhookSecret,
        },
      },
    );
  });

  it("should call webhook with SendHardDecline event", async () => {
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

    const partner = createFakePartner();

    when(partnerService.getPartner(partner.props._id)).thenResolve(partner);
    when(partnerService.getWebhook(deepEqual(partner), WebhookType.NOTIFICATION)).thenReturn(partner.props.webhooks[0]);

    mockAxios.post.mockResolvedValueOnce({ data: {}, status: 200, statusText: "Ok", headers: {}, config: {} });

    await webhookService.sendHardDeclineMessage(payload);

    expect(mockAxios.post).toHaveBeenCalledWith(
      "https://fake-api.noba.com",
      {
        event: NotificationEventType.SEND_HARD_DECLINE_EVENT,
        userData: {
          email: payload.email,
          firstName: payload.firstName,
          lastName: payload.lastName,
          nobaUserID: payload.nobaUserID,
        },
        paymentHardDeclineInformation: {
          sessionId: payload.sessionID,
          transactionID: payload.transactionID,
          paymentToken: payload.paymentToken,
          responseCode: payload.responseCode,
          summary: payload.responseSummary,
          processor: payload.processor,
          timestamp: new Date().toUTCString(),
        },
      },
      {
        auth: {
          username: partner.props.webhookClientID,
          password: partner.props.webhookSecret,
        },
      },
    );
  });
});

function createFakePartner(): Partner {
  return Partner.createPartner({
    name: "Fake Partner",
    _id: "fake-partner-1234",
    webhookSecret: "fakeSecret",
    webhookClientID: "fakeClientID",
    webhooks: [{ url: "https://fake-api.noba.com", type: WebhookType.NOTIFICATION }],
  });
}
