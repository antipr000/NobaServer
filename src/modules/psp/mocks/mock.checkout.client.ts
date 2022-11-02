import { anyNumber, anyString, anything, mock, when } from "ts-mockito";
import { CheckoutClient } from "../checkout.client";

export function getMockCheckoutClientWithDefaults(): CheckoutClient {
  const checkoutClient = mock(CheckoutClient);
  when(checkoutClient.addCreditCardPaymentMethod(anything(), anyString())).thenReject(new Error("Not implemented!"));
  when(checkoutClient.removePaymentMethod(anyString())).thenReject(new Error("Not implemented!"));
  when(checkoutClient.makeCardPayment(anyNumber(), anyString(), anyString(), anyString())).thenReject(
    new Error("Method not implemented!"),
  );
  when(checkoutClient.makeACHPayment(anyNumber(), anyString(), anyString(), anyString())).thenReject(
    new Error("Method not implemented!"),
  );
  when(checkoutClient.getPaymentDetails(anyString())).thenReject(new Error("Method not implemented!"));
  return checkoutClient;
}
