const body = {
  id: "evt_3ozzd6mnz5oevmljsghqaxgtam",
  type: "payment_capture_pending",
  version: "1.0.19",
  created_on: "2022-11-04T14:53:14.870272Z",
  data: {
    id: "pay_iqcleuyrcshu7phaxik4co2yoe",
    action_id: "act_tk2zgtyfamluzooxabq2fhe4dq",
    amount: 5000,
    processed_on: "2022-11-04T14:53:13.8592261+00:00",
    metadata: {
      order_id: "O_UjEE4dcKHCCmaXkIqB3",
    },
    currency: "USD",
    event_links: {
      payment: "https://api.sandbox.checkout.com/payments/pay_iqcleuyrcshu7phaxik4co2yoe",
      payment_actions: "https://api.sandbox.checkout.com/payments/pay_iqcleuyrcshu7phaxik4co2yoe/actions",
    },
  },
  _links: {
    self: {
      href: "https://api.sandbox.checkout.com/workflows/events/evt_3ozzd6mnz5oevmljsghqaxgtam",
    },
    subject: {
      href: "https://api.sandbox.checkout.com/workflows/events/subject/pay_iqcleuyrcshu7phaxik4co2yoe",
    },
    payment: {
      href: "https://api.sandbox.checkout.com/payments/pay_iqcleuyrcshu7phaxik4co2yoe",
    },
    payment_actions: {
      href: "https://api.sandbox.checkout.com/payments/pay_iqcleuyrcshu7phaxik4co2yoe/actions",
    },
  },
};
const crypto_ts = require("crypto");
const secret = "abcd";
const payload = JSON.stringify(body ? body : {});
const expectedSignature = crypto_ts.createHmac("sha256", secret).update(payload).digest("hex");
console.log(expectedSignature);
