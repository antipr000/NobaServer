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

describe("SMSEventHandler", () => {
  let currencyService: CurrencyService;
  let smsClient: SMSClient;
  let eventHandler: SMSEventHandler;

  jest.setTimeout(30000);

  beforeAll(async () => {
    currencyService = getMockCurrencyServiceWithDefaults();
    smsClient = getMockSMSClientWithDefaults();

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
        SMSEventHandler,
      ],
    }).compile();

    eventHandler = app.get<SMSEventHandler>(SMSEventHandler);
    when(smsClient.sendSMS(anyString(), anyString())).thenResolve();
  });

  it("should call smsService for SendOtp event", async () => {
    const payload = new SendOtpEvent({
      email: "fake+user@noba.com",
      phone: "+1234567890",
      locale: "en",
      otp: "123456",
      name: "Fake",
      handle: "fake-handle",
    });

    await eventHandler.sendLoginSMS(payload);

    const [recipientPhoneNumber, body] = capture(smsClient.sendSMS).last();
    expect(recipientPhoneNumber).toBe(payload.phone);
    expect(body).toBe(`${payload.otp} is your one-time password for Noba login.`);
  });

  it("should call eventHandler with SendWalletUpdateVerificationCode event", async () => {
    const payload = new SendWalletUpdateVerificationCodeEvent({
      email: "fake+user@noba.com",
      phone: "+1234567890",
      locale: "en",
      otp: "123456",
      name: "Fake",

      walletAddress: "fake-wallet",

      nobaUserID: "fake-noba-user-id",
    });

    await eventHandler.sendWalletUpdateVerificationCodeSMS(payload);

    const [recipientPhoneNumber, body] = capture(smsClient.sendSMS).last();
    expect(recipientPhoneNumber).toBe(payload.phone);
    expect(body).toBe(`${payload.otp} is your wallet verification code`);
  });

  it("should call eventHandler with SendPhoneVerificationCode event", async () => {
    const payload = new SendOtpEvent({
      email: undefined,
      phone: "+1234567890",
      locale: "en",
      otp: "123456",
      name: "Fake",
      handle: "fake-handle",
    });

    await eventHandler.sendPhoneVerificationSMS(payload);
    const [recipientPhoneNumber, body] = capture(smsClient.sendSMS).last();
    expect(recipientPhoneNumber).toBe(payload.phone);
    expect(body).toBe(`${payload.otp} is your one-time password to verify your phone number with Noba.`);
  });
});
