import { TestingModule, Test } from "@nestjs/testing";
import { getTestWinstonModule } from "../../../core/utils/WinstonModule";
import { TestConfigModule } from "../../../core/utils/AppConfigModule";
import { CheckoutClient } from "../checkout.client";
import { getMockCheckoutClientWithDefaults } from "../mocks/mock.checkout.client";
import {
  CHECKOUT_CONFIG_KEY,
  CHECKOUT_COUPON_CODE,
  CHECKOUT_PARTNER_ID,
  CHECKOUT_PROCESSING_CHANNEL_ID,
  CHECKOUT_PUBLIC_KEY,
  CHECKOUT_SECRET_KEY,
} from "../../../config/ConfigurationUtils";
import { Checkout } from "checkout-sdk-node";
import { BadRequestException } from "@nestjs/common";
import { AddPaymentMethodDTO, PaymentType } from "../../consumer/dto/AddPaymentMethodDTO";
import { Consumer } from "../../consumer/domain/Consumer";

/**
 * Need to update config for this to work (work-in-progress). Testing as part of e2e currently.
 */
describe("CheckoutClient", () => {
  let checkoutClient: CheckoutClient;
  let checkoutApi: Checkout;

  jest.setTimeout(20000);

  beforeAll(async () => {
    checkoutClient = getMockCheckoutClientWithDefaults();

    const app: TestingModule = await Test.createTestingModule({
      imports: [
        TestConfigModule.registerAsync({
          [CHECKOUT_CONFIG_KEY]: {
            [CHECKOUT_PUBLIC_KEY]: "pk_sbox_m3756a5g3z4ootpdssqy3hxxemv",
            [CHECKOUT_SECRET_KEY]: "sk_sbox_xdhkcai4bosm32intni46my5x4j",
            [CHECKOUT_COUPON_CODE]: "NY2018",
            [CHECKOUT_PARTNER_ID]: 123989,
            [CHECKOUT_PROCESSING_CHANNEL_ID]: "pc_ka6ij3qluenufp5eovqqtw4xdu",
          },
        }),
        getTestWinstonModule(),
      ],
      controllers: [],
      providers: [CheckoutClient],
    }).compile();

    checkoutClient = app.get<CheckoutClient>(CheckoutClient);
    checkoutApi = new Checkout("sk_sbox_xdhkcai4bosm32intni46my5x4j", {
      pk: "pk_sbox_m3756a5g3z4ootpdssqy3hxxemv",
    });
  });

  async function deleteConsumer(id: string) {
    await checkoutApi.customers.delete(id);
  }

  describe("createConsumer", () => {
    it("should create consumer", async () => {
      const id = await checkoutClient.createConsumer("fake+email@noba.com");
      expect(id).toBeTruthy();
      await deleteConsumer(id);
    });

    it("should return existing customer id if customer already exists", async () => {
      const customerId = await checkoutClient.createConsumer("fake+email@noba.com");
      const newCustomerId = await checkoutClient.createConsumer("fake+email@noba.com");

      expect(customerId).toBe(newCustomerId);

      await deleteConsumer(customerId);
    });

    it("should throw BadRequestException when email is improper", async () => {
      expect(async () => await checkoutClient.createConsumer("abcd")).rejects.toThrow(BadRequestException);
    });
  });

  describe("addCreditCardPaymentMethod", () => {
    it("adds throws error when payment method is not Card", async () => {
      expect(
        async () => await checkoutClient.addCreditCardPaymentMethod({ type: PaymentType.ACH }, "checkout-consumer"),
      ).rejects.toThrow(BadRequestException);
    });

    it("add a new payment method", async () => {
      const addPaymentMethod: AddPaymentMethodDTO = {
        type: PaymentType.CARD,
        cardDetails: {
          cardNumber: "4242424242424242",
          expiryMonth: 2,
          expiryYear: 2024,
          cvv: "123",
        },
      };

      const checkoutConsumerId = await checkoutClient.createConsumer("fake+consumer+card@noba.com");

      const response = await checkoutClient.addCreditCardPaymentMethod(addPaymentMethod, checkoutConsumerId);

      expect(response.instrumentID).toBeTruthy();
      expect(response.bin).toBeTruthy();
      expect(response.scheme).toBe("VISA");

      await checkoutClient.removePaymentMethod(response.instrumentID);
      await deleteConsumer(checkoutConsumerId);
    });
  });

  describe("getPaymentMethod", () => {
    it("get payment method", async () => {
      const addPaymentMethod: AddPaymentMethodDTO = {
        type: PaymentType.CARD,
        cardDetails: {
          cardNumber: "4242424242424242",
          expiryMonth: 2,
          expiryYear: 2024,
          cvv: "123",
        },
      };

      const checkoutConsumerId = await checkoutClient.createConsumer("fake+consumer+card@noba.com");

      const paymentMethod = await checkoutClient.addCreditCardPaymentMethod(addPaymentMethod, checkoutConsumerId);

      const paymentMethodId = paymentMethod.instrumentID;

      const response = await checkoutClient.getPaymentMethod(paymentMethodId);

      expect(response.instrumentID).toBe(paymentMethodId);
      expect(response.bin).toBe(paymentMethod.bin);

      await checkoutClient.removePaymentMethod(paymentMethodId);
      await deleteConsumer(checkoutConsumerId);
    });
  });

  describe("makeCardPayment", () => {
    it("Make a card payment", async () => {
      const addPaymentMethod: AddPaymentMethodDTO = {
        type: PaymentType.CARD,
        cardDetails: {
          cardNumber: "4242424242424242",
          expiryMonth: 2,
          expiryYear: 2024,
          cvv: "123",
        },
      };

      const consumer = createFakeConsumer("fake+consumer+payment@noba.com");
      const checkoutConsumerId = await checkoutClient.createConsumer("fake+consumer+payment@noba.com");

      const addedPaymentMethod = await checkoutClient.addCreditCardPaymentMethod(addPaymentMethod, checkoutConsumerId);

      const paymentToken = addedPaymentMethod.instrumentID;

      const response = await checkoutClient.makeCardPayment(
        1000,
        "USD",
        paymentToken,
        "order_id_1",
        consumer,
        "idempotency-key",
      );

      expect(response.id).toBeTruthy();
      expect(response.response_code).toBe("10000");
      expect(response.response_summary).toBe("Approved");

      await checkoutClient.removePaymentMethod(paymentToken);
      await deleteConsumer(checkoutConsumerId);
    });
  });

  describe("getPaymentDetails", () => {
    it("get status of payment", async () => {
      const addPaymentMethod: AddPaymentMethodDTO = {
        type: PaymentType.CARD,
        cardDetails: {
          cardNumber: "4242424242424242",
          expiryMonth: 2,
          expiryYear: 2024,
          cvv: "123",
        },
      };

      const consumer = createFakeConsumer("fake+consumer+payment@noba.com");
      const checkoutConsumerId = await checkoutClient.createConsumer("fake+consumer+payment@noba.com");

      const addedPaymentMethod = await checkoutClient.addCreditCardPaymentMethod(addPaymentMethod, checkoutConsumerId);

      const paymentToken = addedPaymentMethod.instrumentID;

      const payment = await checkoutClient.makeCardPayment(
        1000,
        "USD",
        paymentToken,
        "order_id_1",
        consumer,
        "idempotency-key",
      );

      const response = await checkoutClient.getPaymentDetails(payment.id);

      expect(response).toBe("Captured");

      await checkoutClient.removePaymentMethod(paymentToken);
      await deleteConsumer(checkoutConsumerId);
    });

    it("should throw error when payment id is wrong", async () => {
      expect(async () => await checkoutClient.getPaymentDetails("fake-id")).rejects.toThrow(BadRequestException);
    });
  });
});

const createFakeConsumer = (email: string): Consumer => {
  return Consumer.createConsumer({
    id: "fake-consumer-id",
    email: email,
    address: {
      streetLine1: "123 main st",
      countryCode: "US",
      city: "irvene",
      regionCode: "CA",
      postalCode: "123456",
    },
  });
};
