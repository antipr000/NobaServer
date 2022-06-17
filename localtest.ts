import Stripe from "stripe";

//web3, infura gists https://github.com/nobapay/gists/blob/main/eth_test.js

// Use our stipe test key
const stripe = new Stripe(
  "sk_test_51KZIlsEe2pZC45hcq7Tjpoi3M7nCc6A5ki95cA8UGF1Ei7b4mCUf6wnAgTJAPzVlpamVGUj7cjQMMhegPYgqELyx00yqpROABj",
  {
    apiVersion: "2020-08-27",
  },
);

// If a customer doesn't exist, create one using the following function
// Caution: With same email - stripe allows creation of multiple customers
// const createCustomer = async () => {
//   const params: Stripe.CustomerCreateParams = {
//     email: 'mohtamohit@gmail.com',
//     description: 'test customer',
//   };

//   const customer: Stripe.Customer = await stripe.customers.create(params);

//   console.log(customer.id);
// };
// createCustomer();

// Get list of all customers with given email from stripe
const getCustomer = async () => {
  const params: Stripe.CustomerListParams = {
    email: "mohtamohit@gmail.com",
  };

  const customers: Stripe.ApiList<Stripe.Customer> = await stripe.customers.list(params);
  // console.log('\n\nFollowing is the response from stripe for getCustomer:');
  // console.log(customers.data);

  return customers;
};
// getCustomer();

// Create a payment method for a customer
// We need not even have a user - we can create payment method without attaching it to a customer
const createPaymentMethod = async () => {
  const params: Stripe.PaymentMethodCreateParams = {
    type: "card",
    card: {
      number: "4242424242424242",
      exp_month: 12,
      exp_year: 2024,
      cvc: "123",
    },
  };

  const paymentMethod = await stripe.paymentMethods.create(params);
  console.log("\n\nFollowing is the response from stripe for createPaymentMethod:");
  console.log(paymentMethod);

  return paymentMethod;
};
// createPaymentMethod();

// Attach a payment method to a customer
const attachPaymentMethod = async () => {
  const customers = await getCustomer();
  const customerID = customers.data[0].id;

  const paymentMethod = await createPaymentMethod();
  const paymentMethodID = paymentMethod.id;

  const paymentMethodAttachParams = {
    customer: customerID,
  };

  await stripe.paymentMethods.attach(paymentMethodID, paymentMethodAttachParams);
};
// attachPaymentMethod();

// List payment methods for a customer
// let us store payment method id at our side corresponding to a card, and customer id! If a different customer uses the same card it is another payment id
const listPaymentMethods = async () => {
  const customers = await getCustomer();
  const customerID = customers.data[0].id;

  const paymentMethods = await stripe.paymentMethods.list({
    customer: customerID,
    type: "card",
  });
  console.log("\n\nFollowing is the response from stripe for listPaymentMethods:");
  console.log(paymentMethods.data);

  return paymentMethods;
};
listPaymentMethods();

// We used payment intent API for stripe integration instead of charge API because https://stripe.com/docs/payments/payment-intents/migration/charges

// Setup Intent
// This won't be used for now - we will use payment intent instead
// const setupIntent = async () => {

//   const customers = await getCustomer();
//   const customerID = customers.data[0].id;

//   const params: Stripe.SetupIntentCreateParams = {
//     usage: 'off_session',
//     payment_method_types: ['card'],
//     customer: customerID,
//     payment_method: 'pm_1GfXKXwX1X1X1X1X1X1X1X1X1X1X1X1X1X1X1X1X1X1X1X1X1X1X1X1X1X1X1X1X1X1X1X1X1X1X1X1',
//   };
//   const setupIntent = await stripe.setupIntents.create(params);
//   console.log(setupIntent);

//   return setupIntent;
// };
// setupIntent();

// Create a payment intent
const createPaymentIntent = async () => {
  const customers = await getCustomer();
  const customerID = customers.data[0].id;

  const paymentMethods = await listPaymentMethods();
  const paymentMethodID = paymentMethods.data[0].id;

  const params: Stripe.PaymentIntentCreateParams = {
    // if we want to charge 20 USD we can use amount: 2000 USD here. Here it is a multiple of 100. So to charge 32.45 USD we can use amount: 3245
    amount: 2000,
    currency: "usd",
    customer: customerID,
    payment_method: paymentMethodID,
    confirmation_method: "automatic",
    confirm: true,
  };

  const paymentIntent = await stripe.paymentIntents.create(params);
  console.log("\n\nFollowing is the response from stripe for createPaymentIntent:");
  console.log(paymentIntent);

  return paymentIntent;
};
// createPaymentIntent();

// list all payment intents
const listPaymentIntents = async () => {
  const customers = await getCustomer();
  const customerID = customers.data[0].id;

  const paymentIntents = await stripe.paymentIntents.list({
    customer: customerID,
  });

  // console.log('\n\nFollowing is the response from stripe for listPaymentIntents:');
  // console.log(paymentIntents.data);

  return paymentIntents;
};
// listPaymentIntents();

// confirm payment intent
// no confirm payment intent needed - creating intent suffices
// const confirmPaymentIntent = async () => {
//   const paymentIntents = await listPaymentIntents();
//   const paymentIntentID = paymentIntents.data[0].id;

// const params: Stripe.PaymentIntentConfirmParams = {
//   payment
// };

// const paymentIntent = await stripe.paymentIntents.confirm(paymentIntentID, params);
// console.log('\n\nFollowing is the response from stripe for confirmPaymentIntent:');
// console.log(paymentIntent);
// }
// confirmPaymentIntent();

// cancel payment intent
// we don't use this as create payment intent succeeds in first go!
// const cancelPaymentIntent = async () => {
//   const paymentIntents = await listPaymentIntents();
//   const paymentIntentID = paymentIntents.data[0].id;

//   const paymentIntent = await stripe.paymentIntents.cancel(paymentIntentID);
//   console.log('\n\nFollowing is the response from stripe for cancelPaymentIntent:');
//   console.log(paymentIntent);
// }
// cancelPaymentIntent();
