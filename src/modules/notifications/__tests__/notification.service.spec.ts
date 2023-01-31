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
import { SendHardDeclineEvent } from "../events/SendHardDeclineEvent";
import { SendCollectionCompletedEvent } from "../events/SendCollectionCompletedEvent";
import { SendDepositCompletedEvent } from "../events/SendDepositCompletedEvent";
import { SendDepositFailedEvent } from "../events/SendDepositFailedEvent";
import { SendDepositInitiatedEvent } from "../events/SendDepositInitiatedEvent";
import { SendWalletTransferEvent } from "../events/SendWalletTransferEvent";
import { SendWithdrawalCompletedEvent } from "../events/SendWithdrawalCompletedEvent";
import { SendWithdrawalFailedEvent } from "../events/SendWithdrawalFailedEvent";
import { SendWithdrawalInitiatedEvent } from "../events/SendWithdrawalInitiatedEvent";
import { SendPhoneVerificationCodeEvent } from "../events/SendPhoneVerificationCodeEvent";
import { IPushTokenRepo } from "../repos/pushtoken.repo";
import { getMockPushTokenRepoWithDefaults } from "../mocks/mock.pushtoken.repo";
import { ServiceException } from "../../../core/exception/ServiceException";

describe("NotificationService", () => {
  let notificationService: NotificationService;
  let eventEmitter: EventEmitter2;
  let pushTokenRepo: IPushTokenRepo;
  jest.setTimeout(30000);

  beforeEach(async () => {
    eventEmitter = getMockEventEmitterWithDefaults();
    pushTokenRepo = getMockPushTokenRepoWithDefaults();

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
          provide: "PushTokenRepo",
          useFactory: () => instance(pushTokenRepo),
        },
      ],
    }).compile();

    notificationService = app.get<NotificationService>(NotificationService);
  });

  describe("subscribeToPushNotifications", () => {
    it("should subscribe to push notifications", async () => {
      when(pushTokenRepo.getPushToken("test-consumer-id", "test-push-token")).thenResolve(undefined);
      when(pushTokenRepo.addPushToken("test-consumer-id", "test-push-token")).thenResolve("push-token-id");
      expect(notificationService.subscribeToPushNotifications("test-consumer-id", "test-push-token")).resolves.toBe(
        "push-token-id",
      );
    });

    it("should not subscribe to push notifications if already subscribed", async () => {
      when(pushTokenRepo.getPushToken("test-consumer-id", "test-push-token")).thenResolve("push-token-id");
      expect(notificationService.subscribeToPushNotifications("test-consumer-id", "test-push-token")).resolves.toBe(
        "push-token-id",
      );
    });
  });

  describe("unsubscribeFromPushNotifications", () => {
    it("should unsubscribe to push notifications", async () => {
      when(pushTokenRepo.deletePushToken("test-consumer-id", "test-push-token")).thenResolve("deleted-push-token-id");
      expect(notificationService.unsubscribeFromPushNotifications("test-consumer-id", "test-push-token")).resolves.toBe(
        "deleted-push-token-id",
      );
    });

    it("should not unsubscribe to push notifications if not subscribed", async () => {
      when(pushTokenRepo.deletePushToken("test-consumer-id", "test-push-token")).thenResolve(undefined);
      expect(
        notificationService.unsubscribeFromPushNotifications("test-consumer-id", "test-push-token"),
      ).rejects.toThrow(ServiceException);
    });
  });

  it("should create email event for otp event when phone is missing", async () => {
    when(eventEmitter.emitAsync(anyString(), anything())).thenResolve();
    await notificationService.sendNotification(NotificationEventType.SEND_OTP_EVENT, {
      email: "fake+user@noba.com",
      locale: "en",
      otp: "123456",
      firstName: "Fake",
      handle: "fake-handle",
    });

    const sendOtpEvent = new SendOtpEvent({
      email: "fake+user@noba.com",
      phone: undefined,
      locale: "en",
      otp: "123456",
      name: "Fake",
      handle: "fake-handle",
    });

    verify(eventEmitter.emitAsync(`email.${NotificationEventType.SEND_OTP_EVENT}`, deepEqual(sendOtpEvent))).once();
  });

  it("should create sms event for otp event when phone is present", async () => {
    when(eventEmitter.emitAsync(anyString(), anything())).thenResolve();
    await notificationService.sendNotification(NotificationEventType.SEND_OTP_EVENT, {
      phone: "+1234567890",
      locale: "en",
      otp: "123456",
      firstName: "Fake",
      handle: "fake-handle",
    });

    const sendOtpEvent = new SendOtpEvent({
      email: undefined,
      phone: "+1234567890",
      locale: "en",
      otp: "123456",
      name: "Fake",
      handle: "fake-handle",
    });

    verify(eventEmitter.emitAsync(`sms.${NotificationEventType.SEND_OTP_EVENT}`, deepEqual(sendOtpEvent))).once();
  });

  it("should emit SMS event for 'SEND_PHONE_VERIFICATION_CODE_EVENT'", async () => {
    when(eventEmitter.emitAsync(anyString(), anything())).thenResolve();
    const sendPhoneVerificationCodeEvent = new SendPhoneVerificationCodeEvent({
      phone: "+1234567890",
      locale: "en",
      otp: "123456",
      name: "Fake",
      handle: "fake-handle",
    });
    await notificationService.sendNotification(NotificationEventType.SEND_PHONE_VERIFICATION_CODE_EVENT, {
      phone: "+1234567890",
      locale: "en",
      otp: "123456",
      firstName: "Fake",
      handle: "fake-handle",
      email: undefined,
    });

    verify(
      eventEmitter.emitAsync(
        `sms.${NotificationEventType.SEND_PHONE_VERIFICATION_CODE_EVENT}`,
        deepEqual(sendPhoneVerificationCodeEvent),
      ),
    ).once();
  });

  it("should not emit any event for 'SEND_PHONE_VERIFICATION_CODE_EVENT' when phone is missing", async () => {
    when(eventEmitter.emitAsync(anyString(), anything())).thenResolve();
    const sendPhoneVerificationCodeEvent = new SendPhoneVerificationCodeEvent({
      phone: undefined,
      locale: "en",
      otp: "123456",
      name: "Fake",
      handle: "fake-handle",
    });
    await notificationService.sendNotification(NotificationEventType.SEND_PHONE_VERIFICATION_CODE_EVENT, {
      email: "fake+email@noba.com",
      locale: "en",
      otp: "123456",
      firstName: "Fake",
      handle: "fake-handle",
    });

    verify(
      eventEmitter.emitAsync(
        `sms.${NotificationEventType.SEND_PHONE_VERIFICATION_CODE_EVENT}`,
        deepEqual(sendPhoneVerificationCodeEvent),
      ),
    ).never();
  });

  it("should emit Email event for 'SEND_KYC_APPROVED_US_EVENT'", async () => {
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
      NotificationEventType.SEND_DEPOSIT_COMPLETED_EVENT,
      NotificationEventType.SEND_DEPOSIT_FAILED_EVENT,
      NotificationEventType.SEND_DEPOSIT_INITIATED_EVENT,
      NotificationEventType.SEND_WITHDRAWAL_COMPLETED_EVENT,
      NotificationEventType.SEND_WITHDRAWAL_FAILED_EVENT,
      NotificationEventType.SEND_WITHDRAWAL_INITIATED_EVENT,
      NotificationEventType.SEND_TRANSFER_COMPLETED_EVENT,
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
      depositCompletedParams: {} as any,
      depositFailedParams: {} as any,
      depositInitiatedParams: {} as any,
      withdrawalCompletedParams: {} as any,
      withdrawalFailedParams: {} as any,
      withdrawalInitiatedParams: {} as any,
      transferCompletedParams: {} as any,
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
        case NotificationEventType.SEND_COLLECTION_COMPLETED_EVENT:
          data = new SendCollectionCompletedEvent({
            email: payload.email,
            firstName: payload.firstName,
            lastName: payload.lastName,
            nobaUserID: payload.nobaUserID,
            locale: payload.locale,
          });
          break;
        case NotificationEventType.SEND_DEPOSIT_COMPLETED_EVENT:
          data = new SendDepositCompletedEvent({
            email: payload.email,
            name: payload.firstName,
            handle: payload.handle,
            params: payload.depositCompletedParams,
            locale: payload.locale,
          });
          break;
        case NotificationEventType.SEND_DEPOSIT_INITIATED_EVENT:
          data = new SendDepositInitiatedEvent({
            email: payload.email,
            name: payload.firstName,
            handle: payload.handle,
            locale: payload.locale,
            params: payload.depositInitiatedParams,
          });
          break;
        case NotificationEventType.SEND_DEPOSIT_FAILED_EVENT:
          data = new SendDepositFailedEvent({
            email: payload.email,
            name: payload.firstName,
            handle: payload.handle,
            locale: payload.locale,
            params: payload.depositFailedParams,
          });
          break;

        case NotificationEventType.SEND_WITHDRAWAL_COMPLETED_EVENT:
          data = new SendWithdrawalCompletedEvent({
            email: payload.email,
            name: payload.firstName,
            handle: payload.handle,
            locale: payload.locale,
            params: payload.withdrawalCompletedParams,
          });
          break;

        case NotificationEventType.SEND_WITHDRAWAL_INITIATED_EVENT:
          data = new SendWithdrawalInitiatedEvent({
            email: payload.email,
            name: payload.firstName,
            handle: payload.handle,
            locale: payload.locale,
            params: payload.withdrawalInitiatedParams,
          });
          break;

        case NotificationEventType.SEND_WITHDRAWAL_FAILED_EVENT:
          data = new SendWithdrawalFailedEvent({
            email: payload.email,
            name: payload.firstName,
            handle: payload.handle,
            locale: payload.locale,
            params: payload.withdrawalFailedParams,
          });
          break;

        case NotificationEventType.SEND_TRANSFER_COMPLETED_EVENT:
          data = new SendWalletTransferEvent({
            email: payload.email,
            name: payload.firstName,
            handle: payload.handle,
            locale: payload.locale,
            params: payload.transferCompletedParams,
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
