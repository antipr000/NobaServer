import { TestingModule, Test } from "@nestjs/testing";
import { getTestWinstonModule } from "../../../core/utils/WinstonModule";
import { TestConfigModule } from "../../../core/utils/AppConfigModule";
import { PaymentService } from "../payment.service";
import { CheckoutClient } from "../checkout.client";
import { getMockCheckoutClientWithDefaults } from "../mocks/mock.checkout.client";
import { anyString, anything, capture, deepEqual, instance, verify, when } from "ts-mockito";
import { NotificationService } from "../../notifications/notification.service";
import { CreditCardService } from "../../common/creditcard.service";
import { getMockNotificationServiceWithDefaults } from "../../notifications/mocks/mock.notification.service";
import { getMockCreditCardServiceWithDefaults } from "../../common/mocks/mock.creditcard.service";
import { FiatTransactionStatus } from "../../consumer/domain/Types";
import { BadRequestException } from "@nestjs/common";
import { Consumer, ConsumerProps } from "../../consumer/domain/Consumer";
import { PaymentMethod, PaymentMethodType } from "../../consumer/domain/PaymentMethod";
import { PaymentProvider } from "../../consumer/domain/PaymentProvider";
import { PaymentMethodStatus } from "../../consumer/domain/VerificationStatus";
import { Transaction } from "../../transactions/domain/Transaction";
import { TransactionStatus } from "../../transactions/domain/Types";
import { AddPaymentMethodDTO, PaymentType } from "../../consumer/dto/AddPaymentMethodDTO";
import { BINValidity, CardType } from "../../common/dto/CreditCardDTO";
import { PaymentProviderDetails } from "../../consumer/domain/PaymentProviderDetails";
import { Utils } from "../../../core/utils/Utils";
import { CardProcessingException } from "../../consumer/CardProcessingException";
import { PlaidClient } from "../plaid.client";
import { getMockPlaidClientWithDefaults } from "../mocks/mock.plaid.client";
import { BankAccountType, TokenProcessor } from "../domain/PlaidTypes";

/**
 * Need to update config for this to work (work-in-progress). Testing as part of e2e currently.
 */
describe("PaymentService", () => {
  let paymentService: PaymentService;
  let checkoutClient: CheckoutClient;
  let notificationService: NotificationService;
  let creditCardService: CreditCardService;
  let plaidClient: PlaidClient;

  jest.setTimeout(10000);

  beforeEach(async () => {
    checkoutClient = getMockCheckoutClientWithDefaults();
    notificationService = getMockNotificationServiceWithDefaults();
    creditCardService = getMockCreditCardServiceWithDefaults();
    plaidClient = getMockPlaidClientWithDefaults();

    const app: TestingModule = await Test.createTestingModule({
      imports: [TestConfigModule.registerAsync({}), getTestWinstonModule()],
      controllers: [],
      providers: [
        {
          provide: CheckoutClient,
          useFactory: () => instance(checkoutClient),
        },
        {
          provide: NotificationService,
          useFactory: () => instance(notificationService),
        },
        {
          provide: CreditCardService,
          useFactory: () => instance(creditCardService),
        },
        {
          provide: PlaidClient,
          useFactory: () => instance(plaidClient),
        },
        PaymentService,
      ],
    }).compile();

    paymentService = app.get<PaymentService>(PaymentService);
  });

  describe("removePaymentMethod", () => {
    it("should remove payment method", async () => {
      const paymentMethodId = "fake-payment-token";
      when(checkoutClient.removePaymentMethod(anyString())).thenResolve();

      await paymentService.removePaymentMethod(paymentMethodId);

      verify(checkoutClient.removePaymentMethod(paymentMethodId)).once();
    });
  });

  describe("getFiatPaymentStatus", () => {
    it("should return status as 'AUTHORIZED' when payment status is Authorized", async () => {
      const paymentId = "fake-payment-id";
      when(checkoutClient.getPaymentDetails(paymentId)).thenResolve("Authorized");

      const response = await paymentService.getFiatPaymentStatus(paymentId);

      expect(response).toBe(FiatTransactionStatus.AUTHORIZED);
    });

    it("should return status as 'CAPTURED' when payment status is Partially Captured", async () => {
      const paymentId = "fake-payment-id";
      when(checkoutClient.getPaymentDetails(paymentId)).thenResolve("Partially Captured");

      const response = await paymentService.getFiatPaymentStatus(paymentId);

      expect(response).toBe(FiatTransactionStatus.CAPTURED);
    });

    it("should return status as 'PENDING' when payment status is Pending", async () => {
      const paymentId = "fake-payment-id";
      when(checkoutClient.getPaymentDetails(paymentId)).thenResolve("Pending");

      const response = await paymentService.getFiatPaymentStatus(paymentId);

      expect(response).toBe(FiatTransactionStatus.PENDING);
    });

    it("should return status as 'FAILED' when payment status is Declined", async () => {
      const paymentId = "fake-payment-id";
      when(checkoutClient.getPaymentDetails(paymentId)).thenResolve("Declined");

      const response = await paymentService.getFiatPaymentStatus(paymentId);

      expect(response).toBe(FiatTransactionStatus.FAILED);
    });

    it("should throw error when getPaymentDetails throws error", async () => {
      const paymentId = "fake-payment-id";
      when(checkoutClient.getPaymentDetails(paymentId)).thenReject(new BadRequestException("Failed to get details"));

      expect(async () => await paymentService.getFiatPaymentStatus(paymentId)).rejects.toThrow(BadRequestException);
    });
  });

  describe("addACHPaymentMethod", () => {
    it("adds a payment method of 'ACH' type", async () => {
      const email = "mock-user@noba.com";
      const partnerId = "partner-1";

      const checkoutCustomerID = "checkout-customer-for-mock-consumer";

      const plaidPublicToken = "public-token-by-plain-embed-ui";
      const plaidAccessToken = "plaid-access-token-for-public-token";
      const plaidAuthGetItemID = "plaid-itemID-for-auth-get-request";
      const plaidAccountID = "plaid-account-id-for-the-consumer-bank-account";
      const plaidCheckoutProcessorToken = "processor-token-for-plaid-checkout-integration";

      const consumer = Consumer.createConsumer({
        _id: "mock-consumer-1",
        firstName: "Fake",
        lastName: "Name",
        email: email,
        displayEmail: email,
        paymentProviderAccounts: [
          {
            providerCustomerID: checkoutCustomerID,
            providerID: PaymentProvider.CHECKOUT,
          },
        ],
        partners: [
          {
            partnerID: partnerId,
          },
        ],
        isAdmin: false,
        paymentMethods: [],
        cryptoWallets: [],
      });

      const addPaymentMethod: AddPaymentMethodDTO = {
        type: PaymentType.ACH,
        name: "Bank Account",
        achDetails: {
          token: plaidPublicToken,
        },
        imageUri: "https://noba.com",
      } as any;

      when(plaidClient.exchangeForAccessToken(deepEqual({ publicToken: plaidPublicToken }))).thenResolve(
        plaidAccessToken,
      );
      when(plaidClient.retrieveAccountData(deepEqual({ accessToken: plaidAccessToken }))).thenResolve({
        accountID: plaidAccountID,
        itemID: plaidAuthGetItemID,
        accountNumber: "1234567890",
        achRoutingNumber: "123456789",
        availableBalance: "1234.56",
        currencyCode: "USD",
        mask: "7890",
        name: "Bank Account",
        accountType: BankAccountType.CHECKING,
        wireRoutingNumber: "987654321",
      });
      when(
        plaidClient.createProcessorToken(
          deepEqual({
            accessToken: plaidAccessToken,
            accountID: plaidAccountID,
            tokenProcessor: TokenProcessor.CHECKOUT,
          }),
        ),
      ).thenResolve(plaidCheckoutProcessorToken);

      const expectedConsumerProps: ConsumerProps = {
        _id: "mock-consumer-1",
        firstName: "Fake",
        lastName: "Name",
        email: email,
        displayEmail: email,
        paymentProviderAccounts: [
          {
            providerCustomerID: checkoutCustomerID,
            providerID: PaymentProvider.CHECKOUT,
          },
        ],
        partners: [
          {
            partnerID: partnerId,
          },
        ],
        isAdmin: false,
        paymentMethods: [
          {
            name: "Bank Account",
            type: PaymentMethodType.ACH,
            achData: {
              accessToken: plaidAccessToken,
              accountID: plaidAccountID,
              itemID: plaidAuthGetItemID,
              mask: "7890",
              accountType: BankAccountType.CHECKING,
            },
            paymentProviderID: PaymentProvider.CHECKOUT,
            paymentToken: plaidCheckoutProcessorToken,
            imageUri: "https://noba.com",
            status: PaymentMethodStatus.APPROVED,
          },
        ],
        cryptoWallets: [],
      };

      const response = await paymentService.addPaymentMethod(consumer, addPaymentMethod, partnerId);

      expect(response.updatedConsumerData).toBeTruthy();
      expect(response.updatedConsumerData).toStrictEqual(expectedConsumerProps);
    });

    it("adds a payment method of 'ACH' type AFTER creating Checkout customer if this is the first payment method", async () => {
      const email = "mock-user@noba.com";
      const partnerId = "partner-1";

      const checkoutCustomerID = "checkout-customer-for-mock-consumer";

      const plaidPublicToken = "public-token-by-plain-embed-ui";
      const plaidAccessToken = "plaid-access-token-for-public-token";
      const plaidAuthGetItemID = "plaid-itemID-for-auth-get-request";
      const plaidAccountID = "plaid-account-id-for-the-consumer-bank-account";
      const plaidCheckoutProcessorToken = "processor-token-for-plaid-checkout-integration";

      const consumer = Consumer.createConsumer({
        _id: "mock-consumer-2",
        firstName: "Fake",
        lastName: "Name",
        email: email,
        displayEmail: email,
        paymentProviderAccounts: [],
        partners: [
          {
            partnerID: partnerId,
          },
        ],
        isAdmin: false,
        paymentMethods: [],
        cryptoWallets: [],
      });

      const addPaymentMethod: AddPaymentMethodDTO = {
        type: PaymentType.ACH,
        name: "Bank Account",
        achDetails: {
          token: plaidPublicToken,
        },
        imageUri: "https://noba.com",
      } as any;

      when(plaidClient.exchangeForAccessToken(deepEqual({ publicToken: plaidPublicToken }))).thenResolve(
        plaidAccessToken,
      );
      when(plaidClient.retrieveAccountData(deepEqual({ accessToken: plaidAccessToken }))).thenResolve({
        accountID: plaidAccountID,
        itemID: plaidAuthGetItemID,
        accountNumber: "1234567890",
        achRoutingNumber: "123456789",
        availableBalance: "1234.56",
        currencyCode: "USD",
        mask: "7890",
        name: "Bank Account",
        accountType: BankAccountType.CHECKING,
        wireRoutingNumber: "987654321",
      });
      when(
        plaidClient.createProcessorToken(
          deepEqual({
            accessToken: plaidAccessToken,
            accountID: plaidAccountID,
            tokenProcessor: TokenProcessor.CHECKOUT,
          }),
        ),
      ).thenResolve(plaidCheckoutProcessorToken);

      when(checkoutClient.createConsumer(consumer.props.email)).thenResolve(checkoutCustomerID);

      const expectedConsumerProps: ConsumerProps = {
        _id: "mock-consumer-2",
        firstName: "Fake",
        lastName: "Name",
        email: email,
        displayEmail: email,
        paymentProviderAccounts: [
          {
            providerCustomerID: checkoutCustomerID,
            providerID: PaymentProvider.CHECKOUT,
          },
        ],
        partners: [
          {
            partnerID: partnerId,
          },
        ],
        isAdmin: false,
        paymentMethods: [
          {
            type: PaymentMethodType.ACH,
            name: "Bank Account",
            achData: {
              accessToken: plaidAccessToken,
              accountID: plaidAccountID,
              itemID: plaidAuthGetItemID,
              mask: "7890",
              accountType: BankAccountType.CHECKING,
            },
            paymentProviderID: PaymentProvider.CHECKOUT,
            paymentToken: plaidCheckoutProcessorToken,
            imageUri: "https://noba.com",
            status: PaymentMethodStatus.APPROVED,
          },
        ],
        cryptoWallets: [],
      };

      const response = await paymentService.addPaymentMethod(consumer, addPaymentMethod, partnerId);

      expect(response.updatedConsumerData).toBeTruthy();
      expect(response.updatedConsumerData).toStrictEqual(expectedConsumerProps);
    });
  });

  describe("addCreditCardPaymentMethod", () => {
    it("should add a new card for exisiting checkout customer", async () => {
      const paymentMethod: AddPaymentMethodDTO = createFakePaymentMethodRequest();

      const consumer = createFakeConsumerRecord(
        [
          {
            providerID: PaymentProvider.CHECKOUT,
            providerCustomerID: "checkout-consumer-1",
          },
        ],
        [],
      );
      when(checkoutClient.addCreditCardPaymentMethod(deepEqual(paymentMethod), "checkout-consumer-1")).thenResolve({
        instrumentID: "fake-payment-token",
        scheme: "VISA",
        bin: "424242",
        issuer: "",
        cardType: "CREDIT",
      });

      when(creditCardService.isBINSupported("424242")).thenResolve(BINValidity.UNKNOWN);

      when(checkoutClient.makeCardPayment(1, "USD", "fake-payment-token", "test_order_1")).thenResolve({
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

      const response = await paymentService.addPaymentMethod(consumer, paymentMethod, "fake-partner-1");

      expect(response.updatedConsumerData).toBeTruthy();
      expect(response.newPaymentMethod).toBeTruthy();
      expect(response.updatedConsumerData.paymentMethods.length).toBe(1);
      expect(response.updatedConsumerData.paymentMethods[0]).toStrictEqual({
        type: PaymentMethodType.CARD,
        imageUri: "https://image.noba.com",
        paymentToken: "fake-payment-token",
        paymentProviderID: PaymentProvider.CHECKOUT,
        cardData: {
          cardType: "CREDIT",
          scheme: "VISA",
          first6Digits: "424242",
          last4Digits: "4242",
          authCode: "100000",
          authReason: "Approved",
        },
        status: PaymentMethodStatus.APPROVED,
        name: "Personal Card",
      });
    });

    it("should create a new consumer account and throw error when card is not supported by Checkout", async () => {
      const paymentMethod: AddPaymentMethodDTO = createFakePaymentMethodRequest();

      const consumer = createFakeConsumerRecord([], []);

      when(checkoutClient.createConsumer(consumer.props.email)).thenResolve("checkout-consumer");

      when(checkoutClient.addCreditCardPaymentMethod(deepEqual(paymentMethod), "checkout-consumer")).thenResolve({
        instrumentID: "fake-payment-token",
        scheme: "VISA",
        bin: "424242",
        issuer: "",
        cardType: "CREDIT",
      });

      when(creditCardService.isBINSupported("424242")).thenResolve(BINValidity.UNKNOWN);

      when(checkoutClient.makeCardPayment(1, "USD", "fake-payment-token", "test_order_1")).thenResolve({
        id: "fake-payment-1",
        response_code: "20014",
        response_summary: "Approved",
        risk: {
          flagged: false,
        },
        bin: "424242",
      });

      when(creditCardService.getBINDetails("424242")).thenResolve(null);

      expect(
        async () => await paymentService.addPaymentMethod(consumer, paymentMethod, "fake-partner-1"),
      ).rejects.toThrow(BadRequestException);
      expect(
        async () => await paymentService.addPaymentMethod(consumer, paymentMethod, "fake-partner-1"),
      ).rejects.toThrow("SOFT-DECLINE");
    });

    it("should throw error when card is rejected and send HARD DECLINE and CARD_ADDITION_FAILED notification", async () => {
      const paymentMethod: AddPaymentMethodDTO = createFakePaymentMethodRequest();

      const consumer = createFakeConsumerRecord(
        [
          {
            providerID: PaymentProvider.CHECKOUT,
            providerCustomerID: "checkout-consumer-1",
          },
        ],
        [],
      );
      when(checkoutClient.addCreditCardPaymentMethod(deepEqual(paymentMethod), "checkout-consumer-1")).thenResolve({
        instrumentID: "fake-payment-token",
        scheme: "VISA",
        bin: "424242",
        issuer: "",
        cardType: "CREDIT",
      });

      when(creditCardService.isBINSupported("424242")).thenResolve(BINValidity.UNKNOWN);

      when(checkoutClient.makeCardPayment(1, "USD", "fake-payment-token", "test_order_1")).thenResolve({
        id: "fake-payment-1",
        response_code: "30000",
        response_summary: "Rejected",
        risk: {
          flagged: false,
        },
        bin: "424242",
      });

      when(creditCardService.getBINDetails("424242")).thenResolve(null);

      expect(
        async () => await paymentService.addPaymentMethod(consumer, paymentMethod, "fake-partner-1"),
      ).rejects.toThrow(BadRequestException);

      // verify(
      //   notificationService.sendNotification(
      //     NotificationEventType.SEND_CARD_ADDITION_FAILED_EVENT,
      //     "fake-partner-1",
      //     deepEqual({
      //       firstName: consumer.props.firstName,
      //       lastName: consumer.props.lastName,
      //       nobaUserID: consumer.props._id,
      //       email: consumer.props.displayEmail,
      //       last4Digits: paymentMethod.cardDetails.cardNumber.substring(
      //         paymentMethod.cardDetails.cardNumber.length - 4,
      //       ),
      //     }),
      //   ),
      // ).once();

      console.log(capture(notificationService.sendNotification));

      // verify(
      //   notificationService.sendNotification(
      //     NotificationEventType.SEND_HARD_DECLINE_EVENT,
      //     "fake-partner-1",
      //     deepEqual({
      //       firstName: consumer.props.firstName,
      //       lastName: consumer.props.lastName,
      //       nobaUserID: consumer.props._id,
      //       email: consumer.props.displayEmail,
      //       sessionID: "verification",
      //       transactionID: "verification",
      //       paymentToken: "fake-payment-token",
      //       processor: PaymentProvider.CHECKOUT,
      //       responseCode: "30000",
      //       responseSummary: "Rejected",
      //     }),
      //   ),
      // ).once();

      expect(
        async () => await paymentService.addPaymentMethod(consumer, paymentMethod, "fake-partner-1"),
      ).rejects.toThrow("DECLINE");
    });

    it("should throw error when card is already added", async () => {
      const paymentMethod: AddPaymentMethodDTO = createFakePaymentMethodRequest();

      const consumer = createFakeConsumerRecord(
        [
          {
            providerID: PaymentProvider.CHECKOUT,
            providerCustomerID: "checkout-consumer-1",
          },
        ],
        [
          {
            type: PaymentMethodType.CARD,
            imageUri: "https://image.noba.com",
            paymentToken: "fake-payment-token",
            paymentProviderID: PaymentProvider.CHECKOUT,
            cardData: {
              cardType: "CREDIT",
              first6Digits: "424242",
              last4Digits: "4242",
              authCode: "100000",
              authReason: "Approved",
            },
            status: PaymentMethodStatus.APPROVED,
            name: "Personal Card",
          },
        ],
      );
      when(checkoutClient.addCreditCardPaymentMethod(deepEqual(paymentMethod), "checkout-consumer-1")).thenResolve({
        instrumentID: "fake-payment-token",
        scheme: "VISA",
        bin: "424242",
        issuer: "",
        cardType: "CREDIT",
      });

      expect(
        async () => await paymentService.addPaymentMethod(consumer, paymentMethod, "fake-partner-1"),
      ).rejects.toThrow(BadRequestException);

      expect(
        async () => await paymentService.addPaymentMethod(consumer, paymentMethod, "fake-partner-1"),
      ).rejects.toThrow("Card already added");
    });

    it("should throw error when bin is not supported", async () => {
      const paymentMethod: AddPaymentMethodDTO = createFakePaymentMethodRequest();

      const consumer = createFakeConsumerRecord(
        [
          {
            providerID: PaymentProvider.CHECKOUT,
            providerCustomerID: "checkout-consumer-1",
          },
        ],
        [],
      );
      when(checkoutClient.addCreditCardPaymentMethod(deepEqual(paymentMethod), "checkout-consumer-1")).thenResolve({
        instrumentID: "fake-payment-token",
        scheme: "VISA",
        bin: "424242",
        issuer: "",
        cardType: "CREDIT",
      });

      when(creditCardService.isBINSupported("424242")).thenResolve(BINValidity.NOT_SUPPORTED);

      expect(
        async () => await paymentService.addPaymentMethod(consumer, paymentMethod, "fake-partner-1"),
      ).rejects.toThrow(BadRequestException);

      expect(
        async () => await paymentService.addPaymentMethod(consumer, paymentMethod, "fake-partner-1"),
      ).rejects.toThrow("NO-CRYPTO");
    });

    it("should add a new card for exisiting checkout customer when BIN is supported", async () => {
      const paymentMethod: AddPaymentMethodDTO = createFakePaymentMethodRequest();

      const consumer = createFakeConsumerRecord(
        [
          {
            providerID: PaymentProvider.CHECKOUT,
            providerCustomerID: "checkout-consumer-1",
          },
        ],
        [],
      );
      when(checkoutClient.addCreditCardPaymentMethod(deepEqual(paymentMethod), "checkout-consumer-1")).thenResolve({
        instrumentID: "fake-payment-token",
        scheme: "VISA",
        bin: "424242",
        issuer: "",
        cardType: "CREDIT",
      });

      when(creditCardService.isBINSupported("424242")).thenResolve(BINValidity.SUPPORTED);

      when(creditCardService.getBINDetails("424242")).thenResolve({
        network: "VISA",
        bin: "424242",
        type: CardType.CREDIT,
        supported: BINValidity.SUPPORTED,
        digits: 16,
        cvvDigits: 3,
      });
      when(creditCardService.updateBinData(anything())).thenResolve();

      const response = await paymentService.addPaymentMethod(consumer, paymentMethod, "fake-partner-1");

      expect(response.updatedConsumerData).toBeTruthy();
      expect(response.newPaymentMethod).toBeTruthy();
      expect(response.updatedConsumerData.paymentMethods.length).toBe(1);
      expect(response.updatedConsumerData.paymentMethods[0]).toStrictEqual({
        type: PaymentMethodType.CARD,
        imageUri: "https://image.noba.com",
        paymentToken: "fake-payment-token",
        paymentProviderID: PaymentProvider.CHECKOUT,
        cardData: {
          cardType: "CREDIT",
          scheme: "VISA",
          first6Digits: "424242",
          last4Digits: "4242",
          authCode: "10000",
          authReason: "Approved",
        },
        status: PaymentMethodStatus.APPROVED,
        name: "Personal Card",
      });
    });
  });

  describe("requestCheckoutPayment", () => {
    it("should make card payment using psp when BIN data is already present", async () => {
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
      const consumer = createFakeConsumerRecord(
        [
          {
            providerID: PaymentProvider.CHECKOUT,
            providerCustomerID: "checkout-consumer-1",
          },
        ],
        [paymentMethod],
      );

      const transaction = createFakeTransaction(consumer, paymentMethod);

      when(
        checkoutClient.makeCardPayment(
          Utils.roundTo2DecimalNumber(transaction.props.leg1Amount) * 100,
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

      when(creditCardService.getBINDetails("123456")).thenResolve({
        network: "VISA",
        bin: "123456",
        type: CardType.CREDIT,
        supported: BINValidity.SUPPORTED,
        digits: 16,
        cvvDigits: 3,
      });

      when(creditCardService.updateBinData(anything())).thenResolve();

      const response = await paymentService.requestCheckoutPayment(consumer, transaction, paymentMethod);

      expect(response.paymentID).toBe("fake-payment-1");
      expect(response.status).toBe(PaymentMethodStatus.APPROVED);
    });

    it("should throw error when card is not supported", async () => {
      const paymentMethod: PaymentMethod = {
        type: PaymentMethodType.CARD,
        imageUri: "https://image.noba.com",
        paymentToken: "fake-payment-token",
        paymentProviderID: PaymentProvider.CHECKOUT,
        cardData: {
          cardType: "CREDIT",
          first6Digits: "424242",
          last4Digits: "4242",
        },
        status: PaymentMethodStatus.APPROVED,
      };
      const consumer = createFakeConsumerRecord(
        [
          {
            providerID: PaymentProvider.CHECKOUT,
            providerCustomerID: "checkout-consumer-1",
          },
        ],
        [paymentMethod],
      );

      const transaction = createFakeTransaction(consumer, paymentMethod);

      when(
        checkoutClient.makeCardPayment(
          Utils.roundTo2DecimalNumber(transaction.props.leg1Amount) * 100,
          transaction.props.leg1,
          paymentMethod.paymentToken,
          transaction.props._id,
        ),
      ).thenResolve({
        id: "fake-payment-1",
        response_code: "20057",
        response_summary: "Rejected",
        risk: {
          flagged: false,
        },
        bin: "424242",
      });

      when(checkoutClient.getPaymentMethod(paymentMethod.paymentToken)).thenResolve({
        instrumentID: paymentMethod.paymentToken,
        scheme: "VISA",
        bin: "424242",
        issuer: "",
        cardType: "CREDIT",
      });

      when(creditCardService.getBINDetails("424242")).thenResolve(null, {
        network: "VISA",
        bin: "424242",
        type: CardType.CREDIT,
        supported: BINValidity.NOT_SUPPORTED,
        digits: 16,
        cvvDigits: 3,
      });

      when(creditCardService.updateBinData(anything())).thenResolve();

      when(creditCardService.addBinData(anything())).thenResolve({
        network: "VISA",
        bin: "424242",
        type: CardType.CREDIT,
        supported: BINValidity.SUPPORTED,
        digits: 16,
        cvvDigits: 3,
      });

      expect(
        async () => await paymentService.requestCheckoutPayment(consumer, transaction, paymentMethod),
      ).rejects.toThrow(CardProcessingException);
    });

    it("should return status of REJECTED when payment method is flagged", async () => {
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
      const consumer = createFakeConsumerRecord(
        [
          {
            providerID: PaymentProvider.CHECKOUT,
            providerCustomerID: "checkout-consumer-1",
          },
        ],
        [paymentMethod],
      );

      const transaction = createFakeTransaction(consumer, paymentMethod);

      when(
        checkoutClient.makeCardPayment(
          Utils.roundTo2DecimalNumber(transaction.props.leg1Amount) * 100,
          transaction.props.leg1,
          paymentMethod.paymentToken,
          transaction.props._id,
        ),
      ).thenResolve({
        id: "fake-payment-1",
        response_code: "400000",
        response_summary: "Flagged",
        risk: {
          flagged: true,
        },
        bin: "123456",
      });

      when(creditCardService.getBINDetails("123456")).thenResolve({
        network: "VISA",
        bin: "123456",
        type: CardType.CREDIT,
        supported: BINValidity.SUPPORTED,
        digits: 16,
        cvvDigits: 3,
      });

      const response = await paymentService.requestCheckoutPayment(consumer, transaction, paymentMethod);

      expect(response.responseCode).toBe("400000");
      expect(response.status).toBe(PaymentMethodStatus.REJECTED);
    });

    it("should make ACH payment using PSP", async () => {
      const paymentMethod: PaymentMethod = {
        type: PaymentMethodType.ACH,
        imageUri: "https://image.noba.com",
        paymentToken: "fake-payment-token",
        paymentProviderID: PaymentProvider.CHECKOUT,
        achData: {
          accountID: "fake-acc-1234",
          accessToken: "token1234",
          itemID: "fake-item",
          mask: "1234",
          accountType: "savings",
        },
        status: PaymentMethodStatus.APPROVED,
      };
      const consumer = createFakeConsumerRecord(
        [
          {
            providerID: PaymentProvider.CHECKOUT,
            providerCustomerID: "checkout-consumer-1",
          },
        ],
        [paymentMethod],
      );

      const transaction = createFakeTransaction(consumer, paymentMethod);

      when(
        checkoutClient.makeACHPayment(
          Utils.roundTo2DecimalNumber(transaction.props.leg1Amount) * 100,
          transaction.props.leg1,
          paymentMethod.paymentToken,
          transaction.props._id,
        ),
      ).thenResolve({
        id: "payment-1234",
        status: "Pending",
        response_code: "100000",
      });

      const response = await paymentService.requestCheckoutPayment(consumer, transaction, paymentMethod);
      expect(response).toStrictEqual({
        paymentID: "payment-1234",
        status: PaymentMethodStatus.APPROVED,
        responseCode: "100000",
      });
    });

    it("should return status of REJECTED when ACH payment fails", async () => {
      const paymentMethod: PaymentMethod = {
        type: PaymentMethodType.ACH,
        imageUri: "https://image.noba.com",
        paymentToken: "fake-payment-token",
        paymentProviderID: PaymentProvider.CHECKOUT,
        achData: {
          accountID: "fake-acc-1234",
          accessToken: "token1234",
          itemID: "fake-item",
          mask: "1234",
          accountType: "savings",
        },
        status: PaymentMethodStatus.APPROVED,
      };
      const consumer = createFakeConsumerRecord(
        [
          {
            providerID: PaymentProvider.CHECKOUT,
            providerCustomerID: "checkout-consumer-1",
          },
        ],
        [paymentMethod],
      );

      const transaction = createFakeTransaction(consumer, paymentMethod);

      when(
        checkoutClient.makeACHPayment(
          Utils.roundTo2DecimalNumber(transaction.props.leg1Amount) * 100,
          transaction.props.leg1,
          paymentMethod.paymentToken,
          transaction.props._id,
        ),
      ).thenResolve({
        id: "payment-1234",
        status: "Rejected",
        response_code: "20000",
      });

      const response = await paymentService.requestCheckoutPayment(consumer, transaction, paymentMethod);
      expect(response).toStrictEqual({
        paymentID: "payment-1234",
        status: PaymentMethodStatus.REJECTED,
        responseCode: "20000",
      });
    });
  });
});

function createFakePaymentMethodRequest(): AddPaymentMethodDTO {
  return {
    name: "Personal Card",
    type: PaymentType.CARD,
    cardDetails: {
      cardNumber: "4242424242424242",
      expiryMonth: 2,
      expiryYear: 2024,
      cvv: "123",
    },
    imageUri: "https://image.noba.com",
  };
}

function createFakeConsumerRecord(
  paymentProviderAccounts: PaymentProviderDetails[],
  paymentMethods: PaymentMethod[],
): Consumer {
  return Consumer.createConsumer({
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
    paymentProviderAccounts: paymentProviderAccounts,
    paymentMethods: paymentMethods,
  });
}

function createFakeTransaction(consumer: Consumer, paymentMethod: PaymentMethod): Transaction {
  return Transaction.createTransaction({
    _id: "1111111111",
    userId: consumer.props._id,
    transactionStatus: TransactionStatus.FIAT_INCOMING_INITIATED,
    fiatPaymentInfo: {
      paymentMethodID: paymentMethod.paymentToken,
      isCompleted: false,
      isApproved: false,
      isFailed: false,
      details: [],
      paymentProvider: PaymentProvider.CHECKOUT,
    },
    leg1Amount: 1000,
    leg2Amount: 0.01,
    leg1: "USD",
    leg2: "ETH",
    partnerID: "fake-partner-1",
    lastProcessingTimestamp: Date.now().valueOf(),
    lastStatusUpdateTimestamp: Date.now().valueOf(),
  });
}
