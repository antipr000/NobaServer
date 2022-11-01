import { anyString, anything, mock, when } from "ts-mockito";
import { PaymentService } from "../payment.service";

export function getMockPaymentServiceWithDefaults() {
  const paymentService = mock(PaymentService);

  when(paymentService.addCreditCardPaymentMethod(anything(), anything(), anyString())).thenReject(
    new Error("Not implemented!"),
  );
  when(paymentService.getFiatPaymentStatus(anyString())).thenReject(new Error("Not implemented!"));
  when(paymentService.removePaymentMethod(anyString())).thenReject(new Error("Not implemented!"));
  when(paymentService.requestCheckoutPayment(anything(), anything(), anything())).thenReject(
    new Error("Not implemented!"),
  );

  return paymentService;
}
