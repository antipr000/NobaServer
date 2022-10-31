import { anyString, anything, mock, when } from "ts-mockito";
import { CardService } from "../card.service";

export function getMockCardServiceWithDefaults() {
  const cardService = mock(CardService);

  when(cardService.addPaymentMethod(anything(), anything(), anyString())).thenReject(new Error("Not implemented!"));
  when(cardService.getFiatPaymentStatus(anyString())).thenReject(new Error("Not implemented!"));
  when(cardService.removePaymentMethod(anyString())).thenReject(new Error("Not implemented!"));
  when(cardService.requestCheckoutPayment(anything(), anything())).thenReject(new Error("Not implemented!"));

  return cardService;
}
