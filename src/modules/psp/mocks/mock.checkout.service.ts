import { anyNumber, anyString, anything, mock, when } from "ts-mockito";
import { CheckoutService } from "../checkout.service";

export function getMockCheckoutServiceWithDefaults(): CheckoutService {
  const checkoutService = mock(CheckoutService);
  when(checkoutService.addPaymentMethod(anything(), anyString())).thenReject(new Error("Not implemented!"));
  when(checkoutService.removePaymentMethod(anyString())).thenReject(new Error("Not implemented!"));
  when(checkoutService.makePayment(anyNumber(), anyString(), anyString(), anyString())).thenReject(
    new Error("Method not implemented!"),
  );
  when(checkoutService.getPaymentDetails(anyString())).thenReject(new Error("Method not implemented!"));
  return checkoutService;
}
