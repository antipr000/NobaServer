import { anyString, anything, mock, when } from "ts-mockito";
import { CheckoutService } from "../checkout.service";

export function getMockCheckoutServiceWithDefaults(): CheckoutService {
  const checkoutService = mock(CheckoutService);
  when(checkoutService.addPaymentMethod(anything(), anything(), anyString())).thenReject(new Error("Not implemented!"));
  when(checkoutService.removePaymentMethod(anyString())).thenReject(new Error("Not implemented!"));
  when(checkoutService.requestCheckoutPayment(anything(), anything())).thenReject(new Error("Method not implemented!"));
  when(checkoutService.getFiatPaymentStatus(anyString())).thenReject(new Error("Method not implemented!"));
  return checkoutService;
}
