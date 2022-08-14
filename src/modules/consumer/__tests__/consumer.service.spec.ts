import { Test, TestingModule } from "@nestjs/testing";
import { getMockOtpRepoWithDefaults } from "../../../modules/auth/mocks/MockOtpRepo";
import { IOTPRepo } from "../../../modules/auth/repo/OTPRepo";
import { instance } from "ts-mockito";
import { STRIPE_CONFIG_KEY, STRIPE_SECRET_KEY } from "../../../config/ConfigurationUtils";
import { TestConfigModule } from "../../../core/utils/AppConfigModule";
import { getTestWinstonModule } from "../../../core/utils/WinstonModule";
import { CheckoutService } from "../../../modules/common/checkout.service";
import { EmailService } from "../../../modules/common/email.service";
import { KmsService } from "../../../modules/common/kms.service";
import { getMockEmailServiceWithDefaults } from "../../../modules/common/mocks/mock.email.service";
import { ConsumerService } from "../consumer.service";
import { Consumer } from "../domain/Consumer";
import { PaymentProviders } from "../domain/PaymentProviderDetails";
import { getMockConsumerRepoWithDefaults } from "../mocks/mock.consumer.repo";
import { IConsumerRepo } from "../repos/ConsumerRepo";

describe("ConsumerService", () => {
  let consumerService: ConsumerService;
  let consumerRepo: IConsumerRepo;
  let emailService: EmailService;
  let mockOtpRepo: IOTPRepo;

  jest.setTimeout(30000);

  beforeEach(async () => {
    consumerRepo = getMockConsumerRepoWithDefaults();
    emailService = getMockEmailServiceWithDefaults();
    mockOtpRepo = getMockOtpRepoWithDefaults();

    const ConsumerRepoProvider = {
      provide: "ConsumerRepo",
      useFactory: () => instance(consumerRepo),
    };

    // TODO: Add mock for 'StripeService'
    const app: TestingModule = await Test.createTestingModule({
      imports: [
        TestConfigModule.registerAsync({
          [STRIPE_CONFIG_KEY]: {
            [STRIPE_SECRET_KEY]: "Dummy Stripe Secret",
          },
        }),
        getTestWinstonModule(),
      ],
      controllers: [],
      providers: [
        ConsumerRepoProvider,
        ConsumerService,
        {
          provide: EmailService,
          useFactory: () => instance(emailService),
        },
        {
          provide: "OTPRepo",
          useFactory: () => instance(mockOtpRepo),
        },
        CheckoutService,
        KmsService,
      ],
    }).compile();

    consumerService = app.get<ConsumerService>(ConsumerService);
  });

  describe("consumer service tests", () => {
    it("should create user if not present", async () => {
      const email = "mock-user@noba.com";

      const consumer = Consumer.createConsumer({
        _id: "mock-consumer-1",
        email: email,
        paymentProviderAccounts: [
          {
            providerCustomerID: "test-customer-1",
            providerID: PaymentProviders.STRIPE,
          },
        ],
        partners: [
          {
            partnerID: "partner-1",
          },
        ],
      });
    });
  });
});
