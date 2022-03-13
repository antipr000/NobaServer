import Stripe from 'stripe';

// Use our stipe test key
const stripe = new Stripe('sk_test_51KZIlsEe2pZC45hcq7Tjpoi3M7nCc6A5ki95cA8UGF1Ei7b4mCUf6wnAgTJAPzVlpamVGUj7cjQMMhegPYgqELyx00yqpROABj', {
  apiVersion: '2020-08-27',
});


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
    email: 'mohtamohit@gmail.com',
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
  const customers = await getCustomer();
  const customerID = customers.data[0].id;

  const params: Stripe.PaymentMethodCreateParams = {
    type: 'card',
    card: {
      number: '4242424242424242',
      exp_month: 12,
      exp_year: 2024,
      cvc: '123',
    },
  };

  const paymentMethod = await stripe.paymentMethods.create(params);
  // console.log('\n\nFollowing is the response from stripe for createPaymentMethod:');
  // console.log(paymentMethod);

  return paymentMethod;
}
// createPaymentMethod();

// Attach a payment method to a customer
const attachPaymentMethod = async () => {
  const customers = await getCustomer();
  const customerID = customers.data[0].id;

  const paymentMethod = await createPaymentMethod();
  const paymentMethodID = paymentMethod.id;

  const paymentMethodAttachParams = {
    customer: customerID, //somehow this is not expecting customer id - i am not sure from documentation what is the expectation here
    payment_method: paymentMethodID,
  };
  
  await stripe.paymentMethods.attach('123', paymentMethodAttachParams);
};
// attachPaymentMethod();


// List payment methods for a customer
const listPaymentMethods = async () => {
  const customers = await getCustomer();
  const customerID = customers.data[0].id;

  const paymentMethods = await stripe.paymentMethods.list({
    customer: customerID,
    type: 'card',
  });
  console.log('\n\nFollowing is the response from stripe for listPaymentMethods:');
  console.log(paymentMethods.data);
  
  return paymentMethods;
};
// listPaymentMethods();


// Setup Intent
// This won't be used for now - we will use payment method instead
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