import { anyString, mock, when } from "ts-mockito";
import { CreditCardService } from "../creditcard.service";

export const getMockCreditCardServiceWithDefaults = () => {
  const mockCreditCardService: CreditCardService = mock(CreditCardService);

  when(mockCreditCardService.getBINDetails(anyString())).thenReject(new Error("Not implemented!"));
  when(mockCreditCardService.isBINSupported(anyString())).thenReject(new Error("Not implemented!"));

  return mockCreditCardService;
};
