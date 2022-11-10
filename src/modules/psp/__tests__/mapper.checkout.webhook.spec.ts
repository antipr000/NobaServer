import { Test, TestingModule } from "@nestjs/testing";
import { getTestWinstonModule } from "../../../core/utils/WinstonModule";
import {
  PaymentCapturedWebhookData,
  PaymentCapturePendingWebhookData,
  PaymentPendingWebhookData,
} from "../domain/CheckoutTypes";
import { CheckoutWebhooksMapper } from "../mapper/checkout.webhooks";

describe("CheckoutWebhooksMapperTests", () => {
  let checkoutWebhooksMapper: CheckoutWebhooksMapper;

  beforeEach(async () => {
    const app: TestingModule = await Test.createTestingModule({
      imports: [getTestWinstonModule()],
      controllers: [],
      providers: [CheckoutWebhooksMapper],
    }).compile();

    checkoutWebhooksMapper = app.get<CheckoutWebhooksMapper>(CheckoutWebhooksMapper);
  });

  afterEach(() => {});

  it("'convertRawPaymentPendingWebhook' should map all the fields correctly", () => {
    const paymentPendingCompleteWebhookResponse = {
      id: "evt_3anivkerwvgetnqszdhepxu2cy",
      type: "payment_pending",
      version: "1.0.19",
      created_on: "2022-11-03T16:57:40.5794483Z",
      data: {
        id: "pay_7qnriezymq4unojyzmc2zwvuji",
        amount: 5000,
        currency: "USD",
        processed_on: "2022-11-03T16:57:37.169651Z",
        metadata: {
          order_id: "zpjR4dkqc-K6_LSsijsLv",
        },
        event_links: {
          payment: "https://api.sandbox.checkout.com/payments/pay_7qnriezymq4unojyzmc2zwvuji",
          payment_actions: "https://api.sandbox.checkout.com/payments/pay_7qnriezymq4unojyzmc2zwvuji/actions",
        },
      },
      _links: {
        self: {
          href: "https://api.sandbox.checkout.com/workflows/events/evt_3anivkerwvgetnqszdhepxu2cy",
        },
        subject: {
          href: "https://api.sandbox.checkout.com/workflows/events/subject/pay_7qnriezymq4unojyzmc2zwvuji",
        },
        payment: {
          href: "https://api.sandbox.checkout.com/payments/pay_7qnriezymq4unojyzmc2zwvuji",
        },
        payment_actions: {
          href: "https://api.sandbox.checkout.com/payments/pay_7qnriezymq4unojyzmc2zwvuji/actions",
        },
      },
    };

    const convertedData: PaymentPendingWebhookData = checkoutWebhooksMapper.convertRawPaymentPendingWebhook(
      paymentPendingCompleteWebhookResponse.data,
    );

    expect(convertedData).toStrictEqual({
      paymentID: "pay_7qnriezymq4unojyzmc2zwvuji",
      amount: 5000,
      currency: "USD",
      processedOn: new Date("2022-11-03T16:57:37.169651Z"),
      idempotencyID: "zpjR4dkqc-K6_LSsijsLv",
    });
  });

  it("'convertRawPaymentCapturePendingWebhook' should map all the fields correctly", () => {
    const paymentCapturePendingCompleteWebhookResponse = {
      id: "evt_yyvffzmke7cuzgpbimbojave7a",
      type: "payment_capture_pending",
      version: "1.0.19",
      created_on: "2022-11-03T16:57:40.5822823Z",
      data: {
        id: "pay_7qnriezymq4unojyzmc2zwvuji",
        action_id: "act_z45zg5lsgejevdeqmuifbxwcfm",
        amount: 5000,
        processed_on: "2022-11-03T16:57:39.250567+00:00",
        metadata: {
          order_id: "zpjR4dkqc-K6_LSsijsLv",
        },
        currency: "USD",
        event_links: {
          payment: "https://api.sandbox.checkout.com/payments/pay_7qnriezymq4unojyzmc2zwvuji",
          payment_actions: "https://api.sandbox.checkout.com/payments/pay_7qnriezymq4unojyzmc2zwvuji/actions",
        },
      },
      _links: {
        self: {
          href: "https://api.sandbox.checkout.com/workflows/events/evt_yyvffzmke7cuzgpbimbojave7a",
        },
        subject: {
          href: "https://api.sandbox.checkout.com/workflows/events/subject/pay_7qnriezymq4unojyzmc2zwvuji",
        },
        payment: {
          href: "https://api.sandbox.checkout.com/payments/pay_7qnriezymq4unojyzmc2zwvuji",
        },
        payment_actions: {
          href: "https://api.sandbox.checkout.com/payments/pay_7qnriezymq4unojyzmc2zwvuji/actions",
        },
      },
    };

    const convertedData: PaymentCapturePendingWebhookData =
      checkoutWebhooksMapper.convertRawPaymentCapturePendingWebhook(paymentCapturePendingCompleteWebhookResponse.data);

    expect(convertedData).toStrictEqual({
      paymentID: "pay_7qnriezymq4unojyzmc2zwvuji",
      actionID: "act_z45zg5lsgejevdeqmuifbxwcfm",
      amount: 5000,
      currency: "USD",
      processedOn: new Date("2022-11-03T16:57:39.250567+00:00"),
      idempotencyID: "zpjR4dkqc-K6_LSsijsLv",
    });
  });

  it("'convertRawPaymentCapturePendingWebhook' should map all the fields correctly", () => {
    const paymentCapturePendingCompleteWebhookResponse = {
      id: "evt_jifbihqu4eheho4dkvsbwnjl4i",
      type: "payment_captured",
      version: "1.0.19",
      created_on: "2022-11-06T18:20:39.7132933Z",
      data: {
        id: "pay_6g7tfgtaor3u5l7vfidj7nh5u4",
        action_id: "act_ejru3s5oynnujbzx3lqtijew4u",
        amount: 800,
        processed_on: "2022-11-06T18:20:32.7810927Z",
        response_code: "10000",
        response_summary: "Approved",
        balances: {
          total_authorized: 800,
          total_voided: 0,
          available_to_void: 0,
          total_captured: 800,
          available_to_capture: 0,
          total_refunded: 0,
          available_to_refund: 800,
        },
        metadata: {
          order_id: "2CoLnqGRI2tSdnvTUutfB",
        },
        currency: "USD",
        processing: {
          acquirer_transaction_id: "086695172334982342272",
          acquirer_reference_number: "23129628104418336039329",
        },
        event_links: {
          payment: "https://api.sandbox.checkout.com/payments/pay_6g7tfgtaor3u5l7vfidj7nh5u4",
          payment_actions: "https://api.sandbox.checkout.com/payments/pay_6g7tfgtaor3u5l7vfidj7nh5u4/actions",
          refund: "https://api.sandbox.checkout.com/payments/pay_6g7tfgtaor3u5l7vfidj7nh5u4/refunds",
        },
      },
      _links: {
        self: {
          href: "https://api.sandbox.checkout.com/workflows/events/evt_jifbihqu4eheho4dkvsbwnjl4i",
        },
        subject: {
          href: "https://api.sandbox.checkout.com/workflows/events/subject/pay_6g7tfgtaor3u5l7vfidj7nh5u4",
        },
        payment: {
          href: "https://api.sandbox.checkout.com/payments/pay_6g7tfgtaor3u5l7vfidj7nh5u4",
        },
        payment_actions: {
          href: "https://api.sandbox.checkout.com/payments/pay_6g7tfgtaor3u5l7vfidj7nh5u4/actions",
        },
        refund: {
          href: "https://api.sandbox.checkout.com/payments/pay_6g7tfgtaor3u5l7vfidj7nh5u4/refunds",
        },
      },
    };

    const convertedData: PaymentCapturedWebhookData = checkoutWebhooksMapper.convertRawPaymentCapturedWebhook(
      paymentCapturePendingCompleteWebhookResponse.data,
    );

    expect(convertedData).toStrictEqual({
      paymentID: "pay_6g7tfgtaor3u5l7vfidj7nh5u4",
      actionID: "act_ejru3s5oynnujbzx3lqtijew4u",
      amount: 800,
      currency: "USD",
      processedOn: new Date("2022-11-06T18:20:32.7810927Z"),
      idempotencyID: "2CoLnqGRI2tSdnvTUutfB",
      acquirerReferenceNumber: "23129628104418336039329",
      acquirerTransactionID: "086695172334982342272",
    });
  });
});
