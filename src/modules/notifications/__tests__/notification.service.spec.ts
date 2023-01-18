import { TestingModule, Test } from "@nestjs/testing";
import { getTestWinstonModule } from "../../../core/utils/WinstonModule";
import { TestConfigModule } from "../../../core/utils/AppConfigModule";
import { NotificationService } from "../notification.service";
import { anyString, anything, deepEqual, instance, verify, when } from "ts-mockito";
import { NotificationEventType } from "../domain/NotificationTypes";
import { SENDGRID_API_KEY, SENDGRID_CONFIG_KEY } from "../../../config/ConfigurationUtils";
import { EventEmitter2 } from "@nestjs/event-emitter";
import { getMockEventEmitterWithDefaults } from "../mocks/mock.evetemitter";
import { SendOtpEvent } from "../events/SendOtpEvent";
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

describe("NotificationService", () => {
  let notificationService: NotificationService;
  let eventEmitter: EventEmitter2;

  jest.setTimeout(30000);

  beforeEach(async () => {
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
          provide: EventEmitter2,
          useFactory: () => instance(eventEmitter),
        },
      ],
    }).compile();

    notificationService = app.get<NotificationService>(NotificationService);
  });

  it("should create email event for otp event when partnerID is missing", async () => {
    when(eventEmitter.emitAsync(anyString(), anything())).thenResolve();
    await notificationService.sendNotification(NotificationEventType.SEND_OTP_EVENT, {
      email: "fake+user@noba.com",
      locale: "en",
      otp: "123456",
      firstName: "Fake",
    });

    const sendOtpEvent = new SendOtpEvent({
      email: "fake+user@noba.com",
      locale: "en",
      otp: "123456",
      name: "Fake",
    });

    verify(eventEmitter.emitAsync(`email.${NotificationEventType.SEND_OTP_EVENT}`, deepEqual(sendOtpEvent))).once();
  });

  it("should emit Email event for 'SEND_KYC_APPROVED_US_EVENT' when partner record does not exist", async () => {
    when(eventEmitter.emitAsync(anyString(), anything())).thenResolve();
    await notificationService.sendNotification(NotificationEventType.SEND_KYC_APPROVED_US_EVENT, {
      email: "fake+user@noba.com",
      locale: "en",
      otp: "123456",
      firstName: "Fake",
      lastName: "Name",
      walletAddress: "fake-wallet-address",
      nobaUserID: "fake-noba-user-id",
    });

    const sendKycApprovedUSEvent = new SendKycApprovedUSEvent({
      email: "fake+user@noba.com",
      locale: "en",
      firstName: "Fake",
      lastName: "Name",
      nobaUserID: "fake-noba-user-id",
    });

    verify(
      eventEmitter.emitAsync(
        `email.${NotificationEventType.SEND_KYC_APPROVED_US_EVENT}`,
        deepEqual(sendKycApprovedUSEvent),
      ),
    ).once();
  });

  it("should emit Email event for 'SEND_KYC_APPROVED_NON_US_EVENT' when partner record does not have config for the event", async () => {
    when(eventEmitter.emitAsync(anyString(), anything())).thenResolve();
    await notificationService.sendNotification(NotificationEventType.SEND_KYC_APPROVED_NON_US_EVENT, {
      email: "fake+user@noba.com",
      locale: "en",
      otp: "123456",
      firstName: "Fake",
      lastName: "Name",
      walletAddress: "fake-wallet-address",
      nobaUserID: "fake-noba-user-id",
    });

    const sendKycApprovedNonUsEvent = new SendKycApprovedNonUSEvent({
      email: "fake+user@noba.com",
      locale: "en",
      firstName: "Fake",
      lastName: "Name",
      nobaUserID: "fake-noba-user-id",
    });

    /*verify(
      eventEmitter.emitAsync(
        `webhook.${NotificationEventType.SEND_KYC_APPROVED_NON_US_EVENT}`,
        deepEqual(sendKycApprovedNonUsEvent),
      ),
    ).never();*/

    verify(
      eventEmitter.emitAsync(
        `email.${NotificationEventType.SEND_KYC_APPROVED_NON_US_EVENT}`,
        deepEqual(sendKycApprovedNonUsEvent),
      ),
    ).once();
  });

  it("should emit both Email events for every other event when partner is configured", async () => {
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
      locale: "en",
      firstName: "Fake",
      lastName: "User",
      nobaUserID: "fake-noba-user-id",

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
      when(eventEmitter.emitAsync(anyString(), anything())).thenResolve();

      await notificationService.sendNotification(event, payload);
      let data: any;
      switch (event) {
        case NotificationEventType.SEND_KYC_DENIED_EVENT:
          data = new SendKycDeniedEvent({
            email: payload.email,
            locale: "en",
            firstName: payload.firstName,
            lastName: payload.lastName,
            nobaUserID: payload.nobaUserID,
          });
          break;
        case NotificationEventType.SEND_KYC_PENDING_OR_FLAGGED_EVENT:
          data = new SendKycPendingOrFlaggedEvent({
            email: payload.email,
            locale: "en",
            firstName: payload.firstName,
            lastName: payload.lastName,
            nobaUserID: payload.nobaUserID,
          });
          break;
        case NotificationEventType.SEND_DOCUMENT_VERIFICATION_PENDING_EVENT:
          data = new SendDocumentVerificationPendingEvent({
            email: payload.email,
            locale: "en",
            firstName: payload.firstName,
            lastName: payload.lastName,
            nobaUserID: payload.nobaUserID,
          });
          break;
        case NotificationEventType.SEND_DOCUMENT_VERIFICATION_REJECTED_EVENT:
          data = new SendDocumentVerificationRejectedEvent({
            email: payload.email,
            locale: "en",
            firstName: payload.firstName,
            lastName: payload.lastName,
            nobaUserID: payload.nobaUserID,
          });
          break;
        case NotificationEventType.SEND_DOCUMENT_VERIFICATION_TECHNICAL_FAILURE_EVENT:
          data = new SendDocumentVerificationTechnicalFailureEvent({
            email: payload.email,
            locale: "en",
            firstName: payload.firstName,
            lastName: payload.lastName,
            nobaUserID: payload.nobaUserID,
          });

          break;
        case NotificationEventType.SEND_CARD_ADDED_EVENT:
          data = new SendCardAddedEvent({
            email: payload.email,
            locale: "en",
            firstName: payload.firstName,
            lastName: payload.lastName,
            nobaUserID: payload.nobaUserID,

            cardNetwork: payload.cardNetwork,
            last4Digits: payload.last4Digits,
          });
          break;
        case NotificationEventType.SEND_CARD_ADDITION_FAILED_EVENT:
          data = new SendCardAdditionFailedEvent({
            email: payload.email,
            locale: "en",
            firstName: payload.firstName,
            lastName: payload.lastName,
            nobaUserID: payload.nobaUserID,

            last4Digits: payload.last4Digits,
          });
          break;
        case NotificationEventType.SEND_CARD_DELETED_EVENT:
          data = new SendCardDeletedEvent({
            email: payload.email,
            locale: "en",
            firstName: payload.firstName,
            lastName: payload.lastName,
            nobaUserID: payload.nobaUserID,

            cardNetwork: payload.cardNetwork,
            last4Digits: payload.last4Digits,
          });
          break;
        case NotificationEventType.SEND_TRANSACTION_INITIATED_EVENT:
          data = new SendTransactionInitiatedEvent({
            email: payload.email,
            locale: "en",
            firstName: payload.firstName,
            lastName: payload.lastName,
            nobaUserID: payload.nobaUserID,

            params: payload.transactionInitiatedParams,
          });
          break;
        case NotificationEventType.SEND_CRYPTO_FAILED_EVENT:
          data = new SendCryptoFailedEvent({
            email: payload.email,
            locale: "en",
            firstName: payload.firstName,
            lastName: payload.lastName,
            nobaUserID: payload.nobaUserID,

            params: payload.cryptoFailedParams,
          });
          break;
        case NotificationEventType.SEND_TRANSACTION_COMPLETED_EVENT:
          data = new SendOrderExecutedEvent({
            email: payload.email,
            locale: "en",
            firstName: payload.firstName,
            lastName: payload.lastName,
            nobaUserID: payload.nobaUserID,

            params: payload.orderExecutedParams,
          });
          break;
        case NotificationEventType.SEND_TRANSACTION_FAILED_EVENT:
          data = new SendOrderFailedEvent({
            email: payload.email,
            locale: "en",
            firstName: payload.firstName,
            lastName: payload.lastName,
            nobaUserID: payload.nobaUserID,

            params: payload.orderFailedParams,
          });
          break;
        case NotificationEventType.SEND_HARD_DECLINE_EVENT:
          data = new SendHardDeclineEvent({
            email: payload.email,
            locale: "en",
            firstName: payload.firstName,
            lastName: payload.lastName,
            nobaUserID: payload.nobaUserID,

            sessionID: payload.sessionID,
            transactionID: payload.transactionID,
            paymentToken: payload.paymentToken,
            processor: payload.processor,
            responseCode: payload.responseCode,
            responseSummary: payload.responseSummary,
          });
          break;
      }

      //verify(eventEmitter.emitAsync(`webhook.${event}`, deepEqual(data))).once();

      verify(eventEmitter.emitAsync(`email.${event}`, deepEqual(data))).once();
    });
  });
});
