import { TestingModule, Test } from "@nestjs/testing";
import { anything, instance, when } from "ts-mockito";
import { ConsumerService } from "../consumer.service";
import { getMockConsumerRepoWithDefaults } from "../mocks/mock.consumer.repo";
import { getTestWinstonModule } from "../../../core/utils/WinstonModule";
import { TestConfigModule } from "../../../core/utils/AppConfigModule";
import { IConsumerRepo } from "../repos/ConsumerRepo";
import { StripeService } from "../../common/stripe.service";
import { STRIPE_CONFIG_KEY, STRIPE_SECRET_KEY } from "../../../config/ConfigurationUtils";
import { Result } from "../../../core/logic/Result";
import { Consumer } from "../domain/Consumer";
import { getMockStripeServiceWithDefaults } from "../../common/mocks/mock.stripe.service";
import { PaymentProviders } from "../domain/PaymentProviderDetails";
import { CheckoutService } from "../../../modules/common/checkout.service";

describe("ConsumerService", () => {
  let consumerService: ConsumerService;
  let consumerRepo: IConsumerRepo;
  let stripeService: StripeService;

  jest.setTimeout(30000);

  beforeEach(async () => {
    consumerRepo = getMockConsumerRepoWithDefaults();
    stripeService = getMockStripeServiceWithDefaults();

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
          provide: StripeService,
          useFactory: () => instance(stripeService),
        },
        CheckoutService,
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

      when(consumerRepo.getConsumerByEmail(email)).thenResolve(Result.fail("Not found"));
      when(consumerRepo.createConsumer(anything())).thenResolve();
    });
  });
});
