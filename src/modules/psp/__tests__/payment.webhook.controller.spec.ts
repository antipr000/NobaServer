import { Test, TestingModule } from "@nestjs/testing";
import { CHECKOUT_CONFIG_KEY, CHECKOUT_WEBHOOK_SIGNATURE_KEY } from "../../../config/ConfigurationUtils";
import { TestConfigModule } from "../../../core/utils/AppConfigModule";
import { getTestWinstonModule } from "../../../core/utils/WinstonModule";
import { anything, capture, instance, when } from "ts-mockito";
import { CheckoutWebhooksMapper } from "../mapper/checkout.webhooks";
import { PaymentWebhooksController } from "../payment.webhook.controller";
import crypto_ts from "crypto";
import { ITransactionRepo } from "../../../modules/transaction/repo/transaction.repo";
import { getMockTransactionRepoWithDefaults } from "../../../modules/transaction/mocks/mock.sql.transaction.repo";
import { TRANSACTION_REPO_PROVIDER } from "../../../modules/transaction/repo/transaction.repo.module";

describe.skip("PaymentWebhooksController", () => {
  jest.setTimeout(2000);

  let webhookController: PaymentWebhooksController;
  let transactionRepo: ITransactionRepo;
  const checkoutWebhookSignatureKey = "SIGNATURE-KEY";

  const computeSignature = body => {
    return crypto_ts.createHmac("sha256", checkoutWebhookSignatureKey).update(JSON.stringify(body)).digest("hex");
  };

  beforeEach(async () => {
    process.env = {
      ...process.env,
      NODE_ENV: "development",
      CONFIGS_DIR: __dirname.split("/src")[0] + "/appconfigs",
    };

    transactionRepo = getMockTransactionRepoWithDefaults();

    const app: TestingModule = await Test.createTestingModule({
      imports: [
        TestConfigModule.registerAsync({
          [CHECKOUT_CONFIG_KEY]: {
            [CHECKOUT_WEBHOOK_SIGNATURE_KEY]: checkoutWebhookSignatureKey,
          },
        }),
        getTestWinstonModule(),
      ],
      controllers: [PaymentWebhooksController],
      providers: [
        {
          provide: TRANSACTION_REPO_PROVIDER,
          useFactory: () => instance(transactionRepo),
        },
        CheckoutWebhooksMapper,
      ],
    }).compile();

    webhookController = app.get<PaymentWebhooksController>(PaymentWebhooksController);
  });

  describe("POST /vendors/checkout/webhooks", () => {
    it("shouldn't update anything in Transaction Collection if 'type' is missing in request", async () => {
      const requestBody = {
        id: "webhook-id",
        data: {
          id: "pay_7qnriezymq4unojyzmc2zwvuji",
          action_id: "act_z45zg5lsgejevdeqmuifbxwcfm",
          amount: 5000,
          processed_on: "2022-11-03T16:57:39.250567+00:00",
          metadata: {
            order_id: "zpjR4dkqc-K6_LSsijsLv",
          },
          currency: "USD",
        },
      };
      await webhookController.consumePaymentWebhooks(requestBody, { "cko-signature": computeSignature(requestBody) });
    });

    it("shouldn't update anything in Transaction Collection if 'id' is missing in request", async () => {
      const requestBody = {
        type: "payment_captured",
        data: {
          id: "pay_7qnriezymq4unojyzmc2zwvuji",
          action_id: "act_z45zg5lsgejevdeqmuifbxwcfm",
          amount: 5000,
          processed_on: "2022-11-03T16:57:39.250567+00:00",
          metadata: {
            order_id: "zpjR4dkqc-K6_LSsijsLv",
          },
          currency: "USD",
        },
      };
      await webhookController.consumePaymentWebhooks(requestBody, { "cko-signature": computeSignature(requestBody) });
    });

    it("shouldn't update anything in Transaction Collection if 'data' is missing in request", async () => {
      const requestBody = {
        id: "webhook_id",
        type: "payment_captured",
      };
      await webhookController.consumePaymentWebhooks(requestBody, { "cko-signature": computeSignature(requestBody) });
    });

    it("shouldn't update anything in Transaction Collection if there is mismatch in signature", async () => {
      const requestBody = {
        id: "webhook_id",
        type: "payment_captured",
        data: {
          id: "pay_7qnriezymq4unojyzmc2zwvuji",
          action_id: "act_z45zg5lsgejevdeqmuifbxwcfm",
          amount: 5000,
          processed_on: "2022-11-03T16:57:39.250567+00:00",
          metadata: {
            order_id: "zpjR4dkqc-K6_LSsijsLv",
          },
          currency: "USD",
        },
      };
      await webhookController.consumePaymentWebhooks(requestBody, {
        "cko-signature": computeSignature(requestBody) + "-bad",
      });
    });
    /*
    it("'payment_pending' event shouldn't update anything in Transaction Collection but push event in 'details'", async () => {
      const requestBody = {
        id: "webhook_id",
        type: "payment_pending",
        data: {
          id: "pay_7qnriezymq4unojyzmc2zwvuji",
          amount: 5000,
          processed_on: "2022-11-03T16:57:39.250567+00:00",
          metadata: {
            order_id: "zpjR4dkqc-K6_LSsijsLv",
          },
          currency: "USD",
        },
      };
      when(transactionRepo.updateFiatTransactionInfo(anything())).thenResolve();

      await webhookController.consumePaymentWebhooks(requestBody, { "cko-signature": computeSignature(requestBody) });

      const transactionUpdateRequest = capture(transactionRepo.updateFiatTransactionInfo).last()[0];
      expect(transactionUpdateRequest).toStrictEqual({
        details: JSON.stringify({
          paymentID: "pay_7qnriezymq4unojyzmc2zwvuji",
          amount: 5000,
          currency: "USD",
          processedOn: new Date("2022-11-03T16:57:39.250567+00:00"),
          idempotencyID: "zpjR4dkqc-K6_LSsijsLv",
        }),
        transactionID: "zpjR4dkqc-K6_LSsijsLv",
        willUpdateIsApproved: false,
        willUpdateIsCompleted: false,
        willUpdateIsFailed: false,
      });
    });

    it("'payment_capture_pending' event should update 'isApproved' in Transaction Collection but push event in 'details'", async () => {
      const requestBody = {
        id: "webhook_id",
        type: "payment_capture_pending",
        data: {
          id: "pay_7qnriezymq4unojyzmc2zwvuji",
          action_id: "act_z45zg5lsgejevdeqmuifbxwcfm",
          amount: 5000,
          processed_on: "2022-11-03T16:57:39.250567+00:00",
          metadata: {
            order_id: "zpjR4dkqc-K6_LSsijsLv",
          },
          currency: "USD",
        },
      };
      when(transactionRepo.updateFiatTransactionInfo(anything())).thenResolve();

      await webhookController.consumePaymentWebhooks(requestBody, { "cko-signature": computeSignature(requestBody) });

      const transactionUpdateRequest = capture(transactionRepo.updateFiatTransactionInfo).last()[0];
      expect(transactionUpdateRequest).toStrictEqual({
        details: JSON.stringify({
          paymentID: "pay_7qnriezymq4unojyzmc2zwvuji",
          actionID: "act_z45zg5lsgejevdeqmuifbxwcfm",
          amount: 5000,
          currency: "USD",
          processedOn: new Date("2022-11-03T16:57:39.250567+00:00"),
          idempotencyID: "zpjR4dkqc-K6_LSsijsLv",
        }),
        transactionID: "zpjR4dkqc-K6_LSsijsLv",
        willUpdateIsApproved: true,
        updatedIsApprovedValue: true,
        willUpdateIsCompleted: false,
        willUpdateIsFailed: false,
      });
    });

    it("'payment_captured' event should update 'isCompleted' in Transaction Collection but push event in 'details'", async () => {
      const requestBody = {
        id: "webhook_id",
        type: "payment_captured",
        data: {
          id: "pay_7qnriezymq4unojyzmc2zwvuji",
          action_id: "act_z45zg5lsgejevdeqmuifbxwcfm",
          amount: 5000,
          processed_on: "2022-11-03T16:57:39.250567+00:00",
          metadata: {
            order_id: "zpjR4dkqc-K6_LSsijsLv",
          },
          currency: "USD",
          processing: {
            acquirer_transaction_id: "086695172334982342272",
            acquirer_reference_number: "23129628104418336039329",
          },
        },
      };
      when(transactionRepo.updateFiatTransactionInfo(anything())).thenResolve();

      await webhookController.consumePaymentWebhooks(requestBody, { "cko-signature": computeSignature(requestBody) });

      const transactionUpdateRequest = capture(transactionRepo.updateFiatTransactionInfo).last()[0];
      expect(transactionUpdateRequest).toStrictEqual({
        details: JSON.stringify({
          paymentID: "pay_7qnriezymq4unojyzmc2zwvuji",
          actionID: "act_z45zg5lsgejevdeqmuifbxwcfm",
          amount: 5000,
          currency: "USD",
          processedOn: new Date("2022-11-03T16:57:39.250567+00:00"),
          idempotencyID: "zpjR4dkqc-K6_LSsijsLv",
          acquirerTransactionID: "086695172334982342272",
          acquirerReferenceNumber: "23129628104418336039329",
        }),
        transactionID: "zpjR4dkqc-K6_LSsijsLv",
        willUpdateIsApproved: false,
        willUpdateIsCompleted: true,
        updatedIsCompletedValue: true,
        willUpdateIsFailed: false,
      });
    });*/
  });
});
