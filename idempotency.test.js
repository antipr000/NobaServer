const { Checkout } = require("checkout-sdk-node");

async function run() {
  const checkoutSecretKey = "sk_sbox_xdhkcai4bosm32intni46my5x4j";
  const checkoutPrivatekey = "pk_sbox_m3756a5g3z4ootpdssqy3hxxemv";
  const checkout = new Checkout(checkoutSecretKey, {
    pk: checkoutPrivatekey,
  });

  return checkout.payments.request(
    {
      amount: 50 * 100, // this is amount in cents so if we write 1 here it means 0.01 USD
      currency: "USD",
      source: {
        type: "id",
        id: "src_r5nvpywpij5ezmtmydicyneu7i",
      },
      description: "Noba Customer Payment at UTC " + Date.now(),
      metadata: {
        order_id: "transaction_props__id",
      },
    },
    /*idempotencyKey=*/ "transaction_props__id2",
  );
}

run()
  .then(res => console.log(res))
  .catch(err => console.log(err));
