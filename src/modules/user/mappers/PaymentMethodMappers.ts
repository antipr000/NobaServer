import Stripe from "stripe";
import { PaymentMethodType } from "../domain/Types";
import { PaymentMethodDTO } from "../dto/PaymentMethodDTO";

export function convertStripePaymentMethodToPaymentMethodDTO(
  stripePaymentMethod: Stripe.PaymentMethod,
): PaymentMethodDTO {
  return {
    paymentMethodID: stripePaymentMethod.id,
    paymentMethodType: PaymentMethodType.CARD,
    cardNumber: stripePaymentMethod.card?.last4,
  };
}

// todo I am not sure of the type enforcement here and how do we organise for different payment methods here (as in we haven't introduced a pattern yet) - consult with Ankit once on what should we prefer.
// after that merge this method with the one for Stripe
export function convertCheckoutPaymentMethodToPaymentMethodDTO(checkoutPaymentMethod): PaymentMethodDTO {
  return {
    paymentMethodID: checkoutPaymentMethod.id,
    paymentMethodType: PaymentMethodType.CARD,
    cardNumber: checkoutPaymentMethod.card?.last4,
  };
}
