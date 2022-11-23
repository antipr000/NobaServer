import { TestingModule, Test } from "@nestjs/testing";
import { getTestWinstonModule } from "../../../core/utils/WinstonModule";
import { TestConfigModule } from "../../../core/utils/AppConfigModule";
import { NotificationService } from "../notification.service";
import { anyString, anything, deepEqual, instance, verify, when } from "ts-mockito";
import { NotificationEventType, NotificationEventHandler } from "../domain/NotificationTypes";
import { PartnerService } from "../../../modules/partner/partner.service";
import { getMockPartnerServiceWithDefaults } from "../../../modules/partner/mocks/mock.partner.service";
import { SENDGRID_API_KEY, SENDGRID_CONFIG_KEY } from "../../../config/ConfigurationUtils";
import { EventEmitter2 } from "@nestjs/event-emitter";
import { getMockEventEmitterWithDefaults } from "../mocks/mock.evetemitter";
import { SendOtpEvent } from "../events/SendOtpEvent";
import { Partner } from "../../../modules/partner/domain/Partner";
import { SendWalletUpdateVerificationCodeEvent } from "../events/SendWalletUpdateVerificationCodeEvent";
import { SendWelcomeMessageEvent } from "../events/SendWelcomeMessageEvent";
import { SendKycApprovedUSEvent } from "../events/SendKycApprovedUSEvent";
import { SendKycApprovedNonUSEvent } from "../events/SendKycApprovedNonUSEvent";
import { NotificationPayload } from "../domain/NotificationPayload";
import { SendKycDeniedEvent } from "../events/SendKycDeniedEvent";
import { SendKycPendingOrFlaggedEvent } from "../events/SendKycPendingOrFlaggedEvent";
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
import { WebhookType } from "../../../modules/partner/domain/WebhookTypes";

describe("NotificationService", () => {
  let partnerService: PartnerService;
  let notificationService: NotificationService;
  let eventEmitter: EventEmitter2;

  jest.setTimeout(30000);

  beforeEach(async () => {
    partnerService = getMockPartnerServiceWithDefaults();
    eventEmitter = getMockEventEmitterWithDefaults();

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
          provide: PartnerService,
          useFactory: () => instance(partnerService),
        },
        {
          provide: EventEmitter2,
          useFactory: () => instance(eventEmitter),
        },
      ],
    }).compile();

    notificationService = app.get<NotificationService>(NotificationService);
  });

  it("should create email event for otp event when partnerID is missing", async () => {
    when(eventEmitter.emitAsync(anyString(), anything())).thenResolve();
    await notificationService.sendNotification(NotificationEventType.SEND_OTP_EVENT, undefined, {
      email: "fake+user@noba.com",
      otp: "123456",
      firstName: "Fake",
    });

    const sendOtpEvent = new SendOtpEvent({
      email: "fake+user@noba.com",
      otp: "123456",
      name: "Fake",
      partnerID: undefined,
    });

    verify(eventEmitter.emitAsync(`email.${NotificationEventType.SEND_OTP_EVENT}`, deepEqual(sendOtpEvent))).once();
  });

  it("should create webhook event for 'SEND_WALLET_UPDATE_VERIFICATION_CODE_EVENT' when Partner has proper notificationConfigs", async () => {
    const partner = createFakePartner(NotificationEventType.SEND_WALLET_UPDATE_VERIFICATION_CODE_EVENT, [
      NotificationEventHandler.WEBHOOK,
    ]);

    when(eventEmitter.emitAsync(anyString(), anything())).thenResolve();
    when(partnerService.getPartner(partner.props._id)).thenResolve(partner);
    when(partnerService.getWebhook(partner, WebhookType.NOTIFICATION)).thenReturn(anything());
    await notificationService.sendNotification(
      NotificationEventType.SEND_WALLET_UPDATE_VERIFICATION_CODE_EVENT,
      partner.props._id,
      {
        email: "fake+user@noba.com",
        otp: "123456",
        firstName: "Fake",
        walletAddress: "fake-wallet-address",
        nobaUserID: "fake-noba-user-id",
        partnerUserID: "fake-partner-user-id",
      },
    );

    const sendWalletUpdateVerificationCodeEvent = new SendWalletUpdateVerificationCodeEvent({
      email: "fake+user@noba.com",
      otp: "123456",
      name: "Fake",
      partnerID: partner.props._id,
      walletAddress: "fake-wallet-address",
      nobaUserID: "fake-noba-user-id",
      partnerUserID: "fake-partner-user-id",
    });

    verify(
      eventEmitter.emitAsync(
        `webhook.${NotificationEventType.SEND_WALLET_UPDATE_VERIFICATION_CODE_EVENT}`,
        deepEqual(sendWalletUpdateVerificationCodeEvent),
      ),
    ).once();
  });

  it("should send email instead of webhook event if partner is not configured for webhooks", async () => {
    const partner = createFakePartner(NotificationEventType.SEND_WALLET_UPDATE_VERIFICATION_CODE_EVENT, [
      NotificationEventHandler.WEBHOOK,
    ]);

    when(eventEmitter.emitAsync(anyString(), anything())).thenResolve();
    when(partnerService.getPartner(partner.props._id)).thenResolve(partner);
    when(partnerService.getWebhook(partner, WebhookType.NOTIFICATION)).thenReturn(null);
    await notificationService.sendNotification(
      NotificationEventType.SEND_WALLET_UPDATE_VERIFICATION_CODE_EVENT,
      partner.props._id,
      {
        email: "fake+user@noba.com",
        otp: "123456",
        firstName: "Fake",
        walletAddress: "fake-wallet-address",
        nobaUserID: "fake-noba-user-id",
        partnerUserID: "fake-partner-user-id",
      },
    );

    const sendWalletUpdateVerificationCodeEvent = new SendWalletUpdateVerificationCodeEvent({
      email: "fake+user@noba.com",
      otp: "123456",
      name: "Fake",
      partnerID: partner.props._id,
      walletAddress: "fake-wallet-address",
      nobaUserID: "fake-noba-user-id",
      partnerUserID: "fake-partner-user-id",
    });

    verify(
      eventEmitter.emitAsync(
        `email.${NotificationEventType.SEND_WALLET_UPDATE_VERIFICATION_CODE_EVENT}`,
        deepEqual(sendWalletUpdateVerificationCodeEvent),
      ),
    ).once();
  });

  it("should emit both Webhook and Email events for 'SEND_WELCOME_MESSAGE_EVENT' when partner is configured", async () => {
    const partner = createFakePartner(NotificationEventType.SEND_WELCOME_MESSAGE_EVENT, [
      NotificationEventHandler.WEBHOOK,
      NotificationEventHandler.EMAIL,
    ]);

    when(eventEmitter.emitAsync(anyString(), anything())).thenResolve();
    when(partnerService.getPartner(partner.props._id)).thenResolve(partner);
    when(partnerService.getWebhook(partner, WebhookType.NOTIFICATION)).thenReturn(anything());
    await notificationService.sendNotification(NotificationEventType.SEND_WELCOME_MESSAGE_EVENT, partner.props._id, {
      email: "fake+user@noba.com",
      otp: "123456",
      firstName: "Fake",
      lastName: "Name",
      walletAddress: "fake-wallet-address",
      nobaUserID: "fake-noba-user-id",
      partnerUserID: "fake-partner-user-id",
    });

    const sendWelcomeMessageEvent = new SendWelcomeMessageEvent({
      email: "fake+user@noba.com",
      firstName: "Fake",
      lastName: "Name",
      partnerID: partner.props._id,
      nobaUserID: "fake-noba-user-id",
      partnerUserID: "fake-partner-user-id",
    });

    verify(
      eventEmitter.emitAsync(
        `webhook.${NotificationEventType.SEND_WELCOME_MESSAGE_EVENT}`,
        deepEqual(sendWelcomeMessageEvent),
      ),
    ).once();

    verify(
      eventEmitter.emitAsync(
        `email.${NotificationEventType.SEND_WELCOME_MESSAGE_EVENT}`,
        deepEqual(sendWelcomeMessageEvent),
      ),
    ).once();
  });

  it("should emit Email event for 'SEND_KYC_APPROVED_US_EVENT' when partner record does not exist", async () => {
    when(eventEmitter.emitAsync(anyString(), anything())).thenResolve();
    when(partnerService.getPartner("fake-partner-id")).thenResolve(null);
    await notificationService.sendNotification(NotificationEventType.SEND_KYC_APPROVED_US_EVENT, "fake-partner-id", {
      email: "fake+user@noba.com",
      otp: "123456",
      firstName: "Fake",
      lastName: "Name",
      walletAddress: "fake-wallet-address",
      nobaUserID: "fake-noba-user-id",
      partnerUserID: "fake-partner-user-id",
    });

    const sendKycApprovedUSEvent = new SendKycApprovedUSEvent({
      email: "fake+user@noba.com",
      firstName: "Fake",
      lastName: "Name",
      partnerID: "fake-partner-id",
      nobaUserID: "fake-noba-user-id",
      partnerUserID: "fake-partner-user-id",
    });

    verify(
      eventEmitter.emitAsync(
        `email.${NotificationEventType.SEND_KYC_APPROVED_US_EVENT}`,
        deepEqual(sendKycApprovedUSEvent),
      ),
    ).once();
  });

  it("should emit Email event for 'SEND_KYC_APPROVED_NON_US_EVENT' when partner record does not have config for the event", async () => {
    const partner = createFakePartner(NotificationEventType.SEND_WELCOME_MESSAGE_EVENT, [
      NotificationEventHandler.WEBHOOK,
      NotificationEventHandler.EMAIL,
    ]);

    when(eventEmitter.emitAsync(anyString(), anything())).thenResolve();
    when(partnerService.getPartner(partner.props._id)).thenResolve(partner);
    when(partnerService.getWebhook(partner, WebhookType.NOTIFICATION)).thenReturn(anything());
    await notificationService.sendNotification(
      NotificationEventType.SEND_KYC_APPROVED_NON_US_EVENT,
      partner.props._id,
      {
        email: "fake+user@noba.com",
        otp: "123456",
        firstName: "Fake",
        lastName: "Name",
        walletAddress: "fake-wallet-address",
        nobaUserID: "fake-noba-user-id",
        partnerUserID: "fake-partner-user-id",
      },
    );

    const sendKycApprovedNonUsEvent = new SendKycApprovedNonUSEvent({
      email: "fake+user@noba.com",
      firstName: "Fake",
      lastName: "Name",
      partnerID: partner.props._id,
      nobaUserID: "fake-noba-user-id",
      partnerUserID: "fake-partner-user-id",
    });

    verify(
      eventEmitter.emitAsync(
        `webhook.${NotificationEventType.SEND_KYC_APPROVED_NON_US_EVENT}`,
        deepEqual(sendKycApprovedNonUsEvent),
      ),
    ).never();

    verify(
      eventEmitter.emitAsync(
        `email.${NotificationEventType.SEND_KYC_APPROVED_NON_US_EVENT}`,
        deepEqual(sendKycApprovedNonUsEvent),
      ),
    ).once();
  });

  it("should emit both Webhook and Email events for every other event when partner is configured", async () => {
    const events = [
      NotificationEventType.SEND_KYC_DENIED_EVENT,
      NotificationEventType.SEND_KYC_PENDING_OR_FLAGGED_EVENT,
      NotificationEventType.SEND_DOCUMENT_VERIFICATION_PENDING_EVENT,
      NotificationEventType.SEND_DOCUMENT_VERIFICATION_REJECTED_EVENT,
      NotificationEventType.SEND_DOCUMENT_VERIFICATION_TECHNICAL_FAILURE_EVENT,
      NotificationEventType.SEND_CARD_ADDED_EVENT,
      NotificationEventType.SEND_CARD_ADDITION_FAILED_EVENT,
      NotificationEventType.SEND_CARD_DELETED_EVENT,
      NotificationEventType.SEND_TRANSACTION_INITIATED_EVENT,
      NotificationEventType.SEND_CRYPTO_FAILED_EVENT,
      NotificationEventType.SEND_TRANSACTION_COMPLETED_EVENT,
      NotificationEventType.SEND_TRANSACTION_FAILED_EVENT,
      NotificationEventType.SEND_HARD_DECLINE_EVENT,
    ];

    const payload: NotificationPayload = {
      email: "fake+user@noba.com",
      firstName: "Fake",
      lastName: "User",
      nobaUserID: "fake-noba-user-id",
      partnerUserID: "fake-partner-user-id",
      cardNetwork: "fake-card-network",
      last4Digits: "1234",
      transactionInitiatedParams: {} as any,
      cryptoFailedParams: {} as any,
      orderExecutedParams: {} as any,
      orderFailedParams: {} as any,
      sessionID: "fake-session-id",
      transactionID: "fake-transaction-id",
      paymentToken: "fake-payment-token",
      processor: "fake-processor",
      responseCode: "fakeResponseCode",
      responseSummary: "Fake Summary",
    };

    events.forEach(async event => {
      const partner = createFakePartner(event, [NotificationEventHandler.WEBHOOK, NotificationEventHandler.EMAIL]);

      when(eventEmitter.emitAsync(anyString(), anything())).thenResolve();
      when(partnerService.getPartner(partner.props._id)).thenResolve(partner);
      when(partnerService.getWebhook(partner, WebhookType.NOTIFICATION)).thenReturn(anything());

      await notificationService.sendNotification(event, partner.props._id, payload);
      let data: any;
      switch (event) {
        case NotificationEventType.SEND_KYC_DENIED_EVENT:
          data = new SendKycDeniedEvent({
            email: payload.email,
            firstName: payload.firstName,
            lastName: payload.lastName,
            nobaUserID: payload.nobaUserID,
            partnerUserID: payload.partnerUserID,
            partnerID: partner.props._id,
          });
          break;
        case NotificationEventType.SEND_KYC_PENDING_OR_FLAGGED_EVENT:
          data = new SendKycPendingOrFlaggedEvent({
            email: payload.email,
            firstName: payload.firstName,
            lastName: payload.lastName,
            nobaUserID: payload.nobaUserID,
            partnerUserID: payload.partnerUserID,
            partnerID: partner.props._id,
          });
          break;
        case NotificationEventType.SEND_DOCUMENT_VERIFICATION_PENDING_EVENT:
          data = new SendDocumentVerificationPendingEvent({
            email: payload.email,
            firstName: payload.firstName,
            lastName: payload.lastName,
            nobaUserID: payload.nobaUserID,
            partnerUserID: payload.partnerUserID,
            partnerID: partner.props._id,
          });
          break;
        case NotificationEventType.SEND_DOCUMENT_VERIFICATION_REJECTED_EVENT:
          data = new SendDocumentVerificationRejectedEvent({
            email: payload.email,
            firstName: payload.firstName,
            lastName: payload.lastName,
            nobaUserID: payload.nobaUserID,
            partnerUserID: payload.partnerUserID,
            partnerID: partner.props._id,
          });
          break;
        case NotificationEventType.SEND_DOCUMENT_VERIFICATION_TECHNICAL_FAILURE_EVENT:
          data = new SendDocumentVerificationTechnicalFailureEvent({
            email: payload.email,
            firstName: payload.firstName,
            lastName: payload.lastName,
            nobaUserID: payload.nobaUserID,
            partnerUserID: payload.partnerUserID,
            partnerID: partner.props._id,
          });

          break;
        case NotificationEventType.SEND_CARD_ADDED_EVENT:
          data = new SendCardAddedEvent({
            email: payload.email,
            firstName: payload.firstName,
            lastName: payload.lastName,
            nobaUserID: payload.nobaUserID,
            partnerUserID: payload.partnerUserID,
            cardNetwork: payload.cardNetwork,
            last4Digits: payload.last4Digits,
            partnerID: partner.props._id,
          });
          break;
        case NotificationEventType.SEND_CARD_ADDITION_FAILED_EVENT:
          data = new SendCardAdditionFailedEvent({
            email: payload.email,
            firstName: payload.firstName,
            lastName: payload.lastName,
            nobaUserID: payload.nobaUserID,
            partnerUserID: payload.partnerUserID,
            last4Digits: payload.last4Digits,
            partnerID: partner.props._id,
          });
          break;
        case NotificationEventType.SEND_CARD_DELETED_EVENT:
          data = new SendCardDeletedEvent({
            email: payload.email,
            firstName: payload.firstName,
            lastName: payload.lastName,
            nobaUserID: payload.nobaUserID,
            partnerUserID: payload.partnerUserID,
            cardNetwork: payload.cardNetwork,
            last4Digits: payload.last4Digits,
            partnerID: partner.props._id,
          });
          break;
        case NotificationEventType.SEND_TRANSACTION_INITIATED_EVENT:
          data = new SendTransactionInitiatedEvent({
            email: payload.email,
            firstName: payload.firstName,
            lastName: payload.lastName,
            nobaUserID: payload.nobaUserID,
            partnerUserID: payload.partnerUserID,
            params: payload.transactionInitiatedParams,
            partnerID: partner.props._id,
          });
          break;
        case NotificationEventType.SEND_CRYPTO_FAILED_EVENT:
          data = new SendCryptoFailedEvent({
            email: payload.email,
            firstName: payload.firstName,
            lastName: payload.lastName,
            nobaUserID: payload.nobaUserID,
            partnerUserID: payload.partnerUserID,
            params: payload.cryptoFailedParams,
            partnerID: partner.props._id,
          });
          break;
        case NotificationEventType.SEND_TRANSACTION_COMPLETED_EVENT:
          data = new SendOrderExecutedEvent({
            email: payload.email,
            firstName: payload.firstName,
            lastName: payload.lastName,
            nobaUserID: payload.nobaUserID,
            partnerUserID: payload.partnerUserID,
            params: payload.orderExecutedParams,
            partnerID: partner.props._id,
          });
          break;
        case NotificationEventType.SEND_TRANSACTION_FAILED_EVENT:
          data = new SendOrderFailedEvent({
            email: payload.email,
            firstName: payload.firstName,
            lastName: payload.lastName,
            nobaUserID: payload.nobaUserID,
            partnerUserID: payload.partnerUserID,
            params: payload.orderFailedParams,
            partnerID: partner.props._id,
          });
          break;
        case NotificationEventType.SEND_HARD_DECLINE_EVENT:
          data = new SendHardDeclineEvent({
            email: payload.email,
            firstName: payload.firstName,
            lastName: payload.lastName,
            nobaUserID: payload.nobaUserID,
            partnerUserID: payload.partnerUserID,
            sessionID: payload.sessionID,
            transactionID: payload.transactionID,
            paymentToken: payload.paymentToken,
            processor: payload.processor,
            responseCode: payload.responseCode,
            responseSummary: payload.responseSummary,
            partnerID: partner.props._id,
          });
          break;
      }

      verify(eventEmitter.emitAsync(`webhook.${event}`, deepEqual(data))).once();

      verify(eventEmitter.emitAsync(`email.${event}`, deepEqual(data))).once();
    });
  });
});

function createFakePartner(eventType: NotificationEventType, handlers: NotificationEventHandler[]): Partner {
  return Partner.createPartner({
    _id: "fake-partner-1234",
    name: "Fake Partner",
    webhooks: [{ type: WebhookType.NOTIFICATION, url: "webhook-url" }],
    config: {
      fees: {} as any,
      notificationConfig: [
        {
          notificationEventType: eventType,
          notificationEventHandler: handlers,
        },
      ],
    },
  });
}
