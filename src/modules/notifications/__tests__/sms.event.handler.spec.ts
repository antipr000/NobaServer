import { TestingModule, Test } from "@nestjs/testing";
import { getTestWinstonModule } from "../../../core/utils/WinstonModule";
import { TestConfigModule } from "../../../core/utils/AppConfigModule";
import { anyString, capture, instance, when } from "ts-mockito";
import { SendOtpEvent } from "../events/SendOtpEvent";
import { SendWalletUpdateVerificationCodeEvent } from "../events/SendWalletUpdateVerificationCodeEvent";
import { CurrencyService } from "../../common/currency.service";
import { getMockCurrencyServiceWithDefaults } from "../../common/mocks/mock.currency.service";
import { SMSClient } from "../sms/sms.client";
import { getMockSMSClientWithDefaults } from "../mocks/mock.sms.client";
import { SMSEventHandler } from "../sms.event.handler";
import { SendPhoneVerificationCodeEvent } from "../events/SendPhoneVerificationCodeEvent";
import { EventRepo } from "../repos/event.repo";
import { getMockEventRepoWithDefaults } from "../mocks/mock.event.repo";
import { NotificationEventType } from "../domain/NotificationTypes";
import { EventHandlers } from "../domain/EventHandlers";

describe("SMSEventHandler", () => {
  let currencyService: CurrencyService;
  let smsClient: SMSClient;
  let eventHandler: SMSEventHandler;
  let mockEventRepo: EventRepo;

  jest.setTimeout(30000);

  beforeEach(async () => {
    currencyService = getMockCurrencyServiceWithDefaults();
    smsClient = getMockSMSClientWithDefaults();
    mockEventRepo = getMockEventRepoWithDefaults();

    process.env = {
      ...process.env,
      NODE_ENV: "development",
    };

    const app: TestingModule = await Test.createTestingModule({
      imports: [TestConfigModule.registerAsync({}), getTestWinstonModule()],
      controllers: [],
      providers: [
        {
          provide: CurrencyService,
          useFactory: () => instance(currencyService),
        },
        {
          provide: "SMSClient",
          useFactory: () => instance(smsClient),
        },
        {
          provide: "EventRepo",
          useFactory: () => instance(mockEventRepo),
        },
        SMSEventHandler,
      ],
    }).compile();

    eventHandler = app.get<SMSEventHandler>(SMSEventHandler);
    when(smsClient.sendSMS(anyString(), anyString())).thenResolve();
  });

  it("should call smsClient for SendOtp event", async () => {
    const payload: SendOtpEvent = {
      email: "fake+user@noba.com",
      phone: "+1234567890",
      locale: "en",
      otp: "123456",
      firstName: "Fake",
      handle: "fake-handle",
    };

    when(mockEventRepo.getEventByIDOrName(NotificationEventType.SEND_OTP_EVENT)).thenResolve({
      id: "fake-id",
      name: NotificationEventType.SEND_OTP_EVENT,
      handlers: [EventHandlers.SMS],
      createdTimestamp: new Date(),
      updatedTimestamp: new Date(),
      templates: [
        {
          id: "fake-template-id-2",
          locale: "en",
          templateBody: "Otp is {{otp}}",
          createdTimestamp: new Date(),
          updatedTimestamp: new Date(),
          eventID: "fake-id",
          type: EventHandlers.SMS,
        },
      ],
    });

    await eventHandler.sendLoginSMS(payload);

    const [recipientPhoneNumber, body] = capture(smsClient.sendSMS).last();
    expect(recipientPhoneNumber).toBe(payload.phone);
    expect(body).toStrictEqual("Otp is 123456");
  });

  it("should call smsClient for SendOtp event with spanish template", async () => {
    const payload: SendOtpEvent = {
      email: "fake+user@noba.com",
      phone: "+1234567890",
      locale: "es",
      otp: "123456",
      firstName: "Fake",
      handle: "fake-handle",
    };

    when(mockEventRepo.getEventByIDOrName(NotificationEventType.SEND_OTP_EVENT)).thenResolve({
      id: "fake-id",
      name: NotificationEventType.SEND_OTP_EVENT,
      handlers: [EventHandlers.SMS],
      createdTimestamp: new Date(),
      updatedTimestamp: new Date(),
      templates: [
        {
          id: "fake-template-id-2",
          locale: "en",
          templateBody: "{{otp}} is your one-time password for Noba login.",
          createdTimestamp: new Date(),
          updatedTimestamp: new Date(),
          eventID: "fake-id",
          type: EventHandlers.SMS,
        },
        {
          id: "fake-template-id-1",
          locale: "es",
          templateBody: "{{otp}} es su contraseña de un solo uso para iniciar sesión en Noba.",
          createdTimestamp: new Date(),
          updatedTimestamp: new Date(),
          eventID: "fake-id",
          type: EventHandlers.SMS,
        },
      ],
    });

    await eventHandler.sendLoginSMS(payload);

    const [recipientPhoneNumber, body] = capture(smsClient.sendSMS).last();
    expect(recipientPhoneNumber).toBe(payload.phone);
    expect(body).toStrictEqual("123456 es su contraseña de un solo uso para iniciar sesión en Noba.");
  });

  it("should call smsClient for SendOtp event with en template when template for locale is not available", async () => {
    const payload: SendOtpEvent = {
      email: "fake+user@noba.com",
      phone: "+1234567890",
      locale: "ru",
      otp: "123456",
      firstName: "Fake",
      handle: "fake-handle",
    };

    when(mockEventRepo.getEventByIDOrName(NotificationEventType.SEND_OTP_EVENT)).thenResolve({
      id: "fake-id",
      name: NotificationEventType.SEND_OTP_EVENT,
      handlers: [EventHandlers.SMS],
      createdTimestamp: new Date(),
      updatedTimestamp: new Date(),
      templates: [
        {
          id: "fake-template-id-2",
          locale: "en",
          templateBody: "{{otp}} is your one-time password for Noba login.",
          createdTimestamp: new Date(),
          updatedTimestamp: new Date(),
          eventID: "fake-id",
          type: EventHandlers.SMS,
        },
        {
          id: "fake-template-id-1",
          locale: "es",
          templateBody: "{{otp}} es su contraseña de un solo uso para iniciar sesión en Noba.",
          createdTimestamp: new Date(),
          updatedTimestamp: new Date(),
          eventID: "fake-id",
          type: EventHandlers.SMS,
        },
      ],
    });

    await eventHandler.sendLoginSMS(payload);

    const [recipientPhoneNumber, body] = capture(smsClient.sendSMS).last();
    expect(recipientPhoneNumber).toBe(payload.phone);
    expect(body).toStrictEqual("123456 is your one-time password for Noba login.");
  });

  it("should call smsClient with SendWalletUpdateVerificationCode event", async () => {
    const payload: SendWalletUpdateVerificationCodeEvent = {
      email: "fake+user@noba.com",
      phone: "+1234567890",
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
      handlers: [EventHandlers.SMS],
      createdTimestamp: new Date(),
      updatedTimestamp: new Date(),
      templates: [
        {
          id: "fake-template-id-2",
          locale: "en",
          templateBody: "{{otp}} is your wallet verification code.",
          createdTimestamp: new Date(),
          updatedTimestamp: new Date(),
          eventID: "fake-id",
          type: EventHandlers.SMS,
        },
        {
          id: "fake-template-id-1",
          locale: "es",
          templateBody: "{{otp}} es su código de verificación de billetera.",
          createdTimestamp: new Date(),
          updatedTimestamp: new Date(),
          eventID: "fake-id",
          type: EventHandlers.SMS,
        },
      ],
    });

    await eventHandler.sendWalletUpdateVerificationCodeSMS(payload);

    const [recipientPhoneNumber, body] = capture(smsClient.sendSMS).last();
    expect(recipientPhoneNumber).toBe(payload.phone);
    expect(body).toStrictEqual("123456 is your wallet verification code.");
  });

  it("should call smsClient with SendPhoneVerificationCode event", async () => {
    const payload: SendPhoneVerificationCodeEvent = {
      email: undefined,
      phone: "+1234567890",
      locale: "en",
      otp: "123456",
      firstName: "Fake",
      handle: "fake-handle",
    };

    when(mockEventRepo.getEventByIDOrName(NotificationEventType.SEND_PHONE_VERIFICATION_CODE_EVENT)).thenResolve({
      id: "fake-id",
      name: NotificationEventType.SEND_PHONE_VERIFICATION_CODE_EVENT,
      handlers: [EventHandlers.SMS],
      createdTimestamp: new Date(),
      updatedTimestamp: new Date(),
      templates: [
        {
          id: "fake-template-id-2",
          locale: "en",
          templateBody: "{{otp}} is your one-time password to verify your phone number with Noba.",
          createdTimestamp: new Date(),
          updatedTimestamp: new Date(),
          eventID: "fake-id",
          type: EventHandlers.SMS,
        },
        {
          id: "fake-template-id-1",
          locale: "es",
          templateBody: "{{otp}} es su contraseña de un solo uso para verificar su número de teléfono con Noba.",
          createdTimestamp: new Date(),
          updatedTimestamp: new Date(),
          eventID: "fake-id",
          type: EventHandlers.SMS,
        },
      ],
    });

    await eventHandler.sendPhoneVerificationSMS(payload);
    const [recipientPhoneNumber, body] = capture(smsClient.sendSMS).last();
    expect(recipientPhoneNumber).toBe(payload.phone);
    expect(body).toStrictEqual("123456 is your one-time password to verify your phone number with Noba.");
  });
});
