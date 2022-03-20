import Stripe from "stripe";
import { PaymentMethodType } from "../domain/Types";
import { PaymentMethodDTO } from "../dto/PaymentMethodDTO";


export function convertStripePaymentMethodToPaymentMethodDTO(stripePaymentMethod: Stripe.PaymentMethod): PaymentMethodDTO{
    return {
        paymentMethodId: stripePaymentMethod.id,
        paymentMethodType: PaymentMethodType.CARD,
        cardNumber: stripePaymentMethod.card?.last4,
    }
}