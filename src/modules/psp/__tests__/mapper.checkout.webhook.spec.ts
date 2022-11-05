import { Test, TestingModule } from "@nestjs/testing";
import { getTestWinstonModule } from "../../../core/utils/WinstonModule";
import { PaymentCapturePendingWebhookData, PaymentPendingWebhookData } from "../domain/CheckoutTypes";
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

  afterEach(() => { });

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
          order_id: "zpjR4dkqc-K6_LSsijsLv"
        },
        event_links: {
          payment: "https://api.sandbox.checkout.com/payments/pay_7qnriezymq4unojyzmc2zwvuji",
          payment_actions: "https://api.sandbox.checkout.com/payments/pay_7qnriezymq4unojyzmc2zwvuji/actions"
        }
      },
      _links: {
        self: {
          href: "https://api.sandbox.checkout.com/workflows/events/evt_3anivkerwvgetnqszdhepxu2cy"
        },
        subject: {
          href: "https://api.sandbox.checkout.com/workflows/events/subject/pay_7qnriezymq4unojyzmc2zwvuji"
        },
        payment: {
          href: "https://api.sandbox.checkout.com/payments/pay_7qnriezymq4unojyzmc2zwvuji"
        },
        payment_actions: {
          href: "https://api.sandbox.checkout.com/payments/pay_7qnriezymq4unojyzmc2zwvuji/actions"
        }
      }
    };

    const convertedData: PaymentPendingWebhookData = checkoutWebhooksMapper.convertRawPaymentPendingWebhook(paymentPendingCompleteWebhookResponse.data);

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
          order_id: "zpjR4dkqc-K6_LSsijsLv"
        },
        currency: "USD",
        event_links: {
          payment: "https://api.sandbox.checkout.com/payments/pay_7qnriezymq4unojyzmc2zwvuji",
          payment_actions: "https://api.sandbox.checkout.com/payments/pay_7qnriezymq4unojyzmc2zwvuji/actions"
        }
      },
      _links: {
        self: {
          href: "https://api.sandbox.checkout.com/workflows/events/evt_yyvffzmke7cuzgpbimbojave7a"
        },
        subject: {
          href: "https://api.sandbox.checkout.com/workflows/events/subject/pay_7qnriezymq4unojyzmc2zwvuji"
        },
        payment: {
          href: "https://api.sandbox.checkout.com/payments/pay_7qnriezymq4unojyzmc2zwvuji"
        },
        payment_actions: {
          href: "https://api.sandbox.checkout.com/payments/pay_7qnriezymq4unojyzmc2zwvuji/actions"
        }
      }
    };

    const convertedData: PaymentCapturePendingWebhookData = checkoutWebhooksMapper.convertRawPaymentCapturePendingWebhook(paymentCapturePendingCompleteWebhookResponse.data);

    expect(convertedData).toStrictEqual({
      paymentID: "pay_7qnriezymq4unojyzmc2zwvuji",
      actionID: "act_z45zg5lsgejevdeqmuifbxwcfm",
      amount: 5000,
      currency: "USD",
      processedOn: new Date("2022-11-03T16:57:39.250567+00:00"),
      idempotencyID: "zpjR4dkqc-K6_LSsijsLv",
    });
  });
});