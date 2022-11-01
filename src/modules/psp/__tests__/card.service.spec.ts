import { TestingModule, Test } from "@nestjs/testing";
import { getTestWinstonModule } from "../../../core/utils/WinstonModule";
import { TestConfigModule } from "../../../core/utils/AppConfigModule";
import { PaymentService } from "../payment.service";
import { CheckoutService } from "../checkout.service";
import { getMockCheckoutServiceWithDefaults } from "../mocks/mock.checkout.service";
import { anyString, anything, deepEqual, instance, verify, when } from "ts-mockito";
import { NotificationService } from "../../../modules/notifications/notification.service";
import { CreditCardService } from "../../../modules/common/creditcard.service";
import { getMockNotificationServiceWithDefaults } from "../../../modules/notifications/mocks/mock.notification.service";
import { getMockCreditCardServiceWithDefaults } from "../../../modules/common/mocks/mock.creditcard.service";
import { FiatTransactionStatus } from "../../../modules/consumer/domain/Types";
import { BadRequestException } from "@nestjs/common";
import { Consumer } from "../../../modules/consumer/domain/Consumer";
import { PaymentMethod, PaymentMethodType } from "../../../modules/consumer/domain/PaymentMethod";
import { PaymentProvider } from "../../../modules/consumer/domain/PaymentProvider";
import { PaymentMethodStatus } from "../../../modules/consumer/domain/VerificationStatus";
import { Transaction } from "../../../modules/transactions/domain/Transaction";
import { TransactionStatus } from "../../../modules/transactions/domain/Types";
import { AddPaymentMethodDTO, PaymentType } from "../../../modules/consumer/dto/AddPaymentMethodDTO";
import { BINValidity } from "../../../modules/common/dto/CreditCardDTO";

/**
 * Need to update config for this to work (work-in-progress). Testing as part of e2e currently.
 */
describe("CardService", () => {
  let paymentService: PaymentService;
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
        PaymentService,
      ],
    }).compile();

    paymentService = app.get<PaymentService>(PaymentService);
  });

  describe("removePaymentMethod", () => {
    it("should remove payment method", async () => {
      const paymentMethodId = "fake-payment-token";
      when(checkoutService.removePaymentMethod(anyString())).thenResolve();

      await paymentService.removePaymentMethod(paymentMethodId);

      verify(checkoutService.removePaymentMethod(paymentMethodId)).once();
    });
  });

  describe("getFiatPaymentStatus", () => {
    it("should return status as 'AUTHORIZED' when payment status is Authorized", async () => {
      const paymentId = "fake-payment-id";
      when(checkoutService.getPaymentDetails(paymentId)).thenResolve("Authorized");

      const response = await paymentService.getFiatPaymentStatus(paymentId);

      expect(response).toBe(FiatTransactionStatus.AUTHORIZED);
    });

    it("should return status as 'CAPTURED' when payment status is Partially Captured", async () => {
      const paymentId = "fake-payment-id";
      when(checkoutService.getPaymentDetails(paymentId)).thenResolve("Partially Captured");

      const response = await paymentService.getFiatPaymentStatus(paymentId);

      expect(response).toBe(FiatTransactionStatus.CAPTURED);
    });

    it("should return status as 'PENDING' when payment status is Pending", async () => {
      const paymentId = "fake-payment-id";
      when(checkoutService.getPaymentDetails(paymentId)).thenResolve("Pending");

      const response = await paymentService.getFiatPaymentStatus(paymentId);

      expect(response).toBe(FiatTransactionStatus.PENDING);
    });

    it("should return status as 'FAILED' when payment status is Declined", async () => {
      const paymentId = "fake-payment-id";
      when(checkoutService.getPaymentDetails(paymentId)).thenResolve("Declined");

      const response = await paymentService.getFiatPaymentStatus(paymentId);

      expect(response).toBe(FiatTransactionStatus.FAILED);
    });

    it("should throw error when getPaymentDetails throws error", async () => {
      const paymentId = "fake-payment-id";
      when(checkoutService.getPaymentDetails(paymentId)).thenReject(new BadRequestException("Failed to get details"));

      expect(async () => await paymentService.getFiatPaymentStatus(paymentId)).rejects.toThrow(BadRequestException);
    });
  });

  describe("requestCheckoutPayment", () => {
    it("should make card payment using psp", async () => {
      const paymentMethod: PaymentMethod = {
        type: PaymentMethodType.CARD,
        imageUri: "https://image.noba.com",
        paymentToken: "fake-payment-token",
        paymentProviderID: PaymentProvider.CHECKOUT,
        cardData: {
          cardType: "CREDIT",
          first6Digits: "123456",
          last4Digits: "7890",
        },
        status: PaymentMethodStatus.APPROVED,
      };
      const consumer = Consumer.createConsumer({
        _id: "fake-consumer-1",
        firstName: "Fake",
        lastName: "Consumer",
        email: "fake+consumer@noba.com",
        displayEmail: "fake+consumer@noba.com",
        dateOfBirth: "1980-02-02",
        partners: [
          {
            partnerID: "fake-partner-1",
            partnerUserID: "fake-user-1",
          },
        ],
        paymentProviderAccounts: [
          {
            providerID: PaymentProvider.CHECKOUT,
            providerCustomerID: "checkout-consumer-1",
          },
        ],
        paymentMethods: [paymentMethod],
      });

      const transaction = Transaction.createTransaction({
        _id: "1111111111",
        userId: consumer.props._id,
        transactionStatus: TransactionStatus.FIAT_INCOMING_INITIATED,
        paymentMethodID: paymentMethod.paymentToken,
        leg1Amount: 1000,
        leg2Amount: 0.01,
        leg1: "USD",
        leg2: "ETH",
        partnerID: "fake-partner-1",
        lastProcessingTimestamp: Date.now().valueOf(),
        lastStatusUpdateTimestamp: Date.now().valueOf(),
      });

      when(
        checkoutService.makeCardPayment(
          transaction.props.leg1Amount,
          transaction.props.leg1,
          paymentMethod.paymentToken,
          transaction.props._id,
        ),
      ).thenResolve({
        id: "fake-payment-1",
        response_code: "100000",
        response_summary: "Approved",
        risk: {
          flagged: false,
        },
        bin: "123456",
      });
    });
  });

  describe("addCreditCardPaymentMethod", () => {
    it("should add a new card for exisiting checkout customer", async () => {
      const paymentMethod: AddPaymentMethodDTO = {
        name: "Personal Card",
        type: PaymentType.CARD,
        cardDetails: {
          cardNumber: "4242424242424242",
          expiryMonth: 2,
          expiryYear: 2024,
          cvv: "123",
        },
      };

      const consumer = Consumer.createConsumer({
        _id: "fake-consumer-1",
        firstName: "Fake",
        lastName: "Consumer",
        email: "fake+consumer@noba.com",
        displayEmail: "fake+consumer@noba.com",
        dateOfBirth: "1980-02-02",
        partners: [
          {
            partnerID: "fake-partner-1",
            partnerUserID: "fake-user-1",
          },
        ],
        paymentProviderAccounts: [
          {
            providerID: PaymentProvider.CHECKOUT,
            providerCustomerID: "checkout-consumer-1",
          },
        ],
        paymentMethods: [],
      });

      when(checkoutService.addCreditCardPaymentMethod(deepEqual(paymentMethod), "checkout-consumer-1")).thenResolve({
        instrumentID: "fake-payment-token",
        scheme: "VISA",
        bin: "424242",
        issuer: "",
        cardType: "CREDIT",
      });

      when(creditCardService.isBINSupported("424242")).thenResolve(BINValidity.UNKNOWN);

      when(checkoutService.makeCardPayment(1, "USD", "fake-payment-token", "test_order_1")).thenResolve({
        id: "fake-payment-1",
        response_code: "100000",
        response_summary: "Approved",
        risk: {
          flagged: false,
        },
        bin: "424242",
      });

      when(creditCardService.getBINDetails("424242")).thenResolve(null);
      when(creditCardService.updateBinData(anything())).thenResolve();

      const response = await paymentService.addCreditCardPaymentMethod(consumer, paymentMethod, "fake-partner-1");

      expect(response.updatedConsumerData).toBeTruthy();
      expect(response.newPaymentMethod).toBeTruthy();
    });
  });
});
