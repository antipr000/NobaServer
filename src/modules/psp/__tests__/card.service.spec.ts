import { TestingModule, Test } from "@nestjs/testing";
import { getTestWinstonModule } from "../../../core/utils/WinstonModule";
import { TestConfigModule } from "../../../core/utils/AppConfigModule";
import { CardService } from "../card.service";
import { CheckoutService } from "../checkout.service";
import { getMockCheckoutServiceWithDefaults } from "../mocks/mock.checkout.service";
import { anyString, instance, verify, when } from "ts-mockito";
import { NotificationService } from "../../../modules/notifications/notification.service";
import { CreditCardService } from "../../../modules/common/creditcard.service";
import { getMockNotificationServiceWithDefaults } from "../../../modules/notifications/mocks/mock.notification.service";
import { getMockCreditCardServiceWithDefaults } from "../../../modules/common/mocks/mock.creditcard.service";
import { FiatTransactionStatus } from "../../../modules/consumer/domain/Types";
import { BadRequestException } from "@nestjs/common";

/**
 * Need to update config for this to work (work-in-progress). Testing as part of e2e currently.
 */
describe("LocationService", () => {
  let cardService: CardService;
  let checkoutService: CheckoutService;
  let notificationService: NotificationService;
  let creditCardService: CreditCardService;

  jest.setTimeout(30000);

  beforeEach(async () => {
    checkoutService = getMockCheckoutServiceWithDefaults();
    notificationService = getMockNotificationServiceWithDefaults();
    creditCardService = getMockCreditCardServiceWithDefaults();

    const app: TestingModule = await Test.createTestingModule({
      imports: [TestConfigModule.registerAsync({}), getTestWinstonModule()],
      controllers: [],
      providers: [
        {
          provide: CheckoutService,
          useFactory: () => instance(checkoutService),
        },
        {
          provide: NotificationService,
          useFactory: () => instance(notificationService),
        },
        {
          provide: CreditCardService,
          useFactory: () => instance(creditCardService),
        },
        CardService,
      ],
    }).compile();

    cardService = app.get<CardService>(CardService);
  });

  describe("removePaymentMethod", () => {
    it("should remove payment method", async () => {
      const paymentMethodId = "fake-payment-token";
      when(checkoutService.removePaymentMethod(anyString())).thenResolve();

      await cardService.removePaymentMethod(paymentMethodId);

      verify(checkoutService.removePaymentMethod(paymentMethodId)).once();
    });
  });

  describe("getFiatPaymentStatus", () => {
    it("should return status as 'AUTHORIZED' when payment status is Authorized", async () => {
      const paymentId = "fake-payment-id";
      when(checkoutService.getPaymentDetails(paymentId)).thenResolve("Authorized");

      const response = await cardService.getFiatPaymentStatus(paymentId);

      expect(response).toBe(FiatTransactionStatus.AUTHORIZED);
    });

    it("should return status as 'CAPTURED' when payment status is Partially Captured", async () => {
      const paymentId = "fake-payment-id";
      when(checkoutService.getPaymentDetails(paymentId)).thenResolve("Partially Captured");

      const response = await cardService.getFiatPaymentStatus(paymentId);

      expect(response).toBe(FiatTransactionStatus.CAPTURED);
    });

    it("should return status as 'PENDING' when payment status is Pending", async () => {
      const paymentId = "fake-payment-id";
      when(checkoutService.getPaymentDetails(paymentId)).thenResolve("Pending");

      const response = await cardService.getFiatPaymentStatus(paymentId);

      expect(response).toBe(FiatTransactionStatus.PENDING);
    });

    it("should return status as 'FAILED' when payment status is Declined", async () => {
      const paymentId = "fake-payment-id";
      when(checkoutService.getPaymentDetails(paymentId)).thenResolve("Declined");

      const response = await cardService.getFiatPaymentStatus(paymentId);

      expect(response).toBe(FiatTransactionStatus.FAILED);
    });

    it("should throw error when getPaymentDetails throws error", async () => {
      const paymentId = "fake-payment-id";
      when(checkoutService.getPaymentDetails(paymentId)).thenReject(new BadRequestException("Failed to get details"));

      expect(async () => await cardService.getFiatPaymentStatus(paymentId)).rejects.toThrow(BadRequestException);
    });
  });

  describe("requestCheckoutPayment", () => {
    it("should make payment using PSP", async () => {
      
    });
  });
});
