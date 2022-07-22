import { mock, when } from "ts-mockito";
import { CurrencyService } from "../currency.service";

export const getMockCurrencyServiceWithDefaults = () => {
  const mockCurrencyService: CurrencyService = mock(CurrencyService);

  when(mockCurrencyService.getSupportedCryptocurrencies()).thenReject(new Error("Not implemented!"));
  when(mockCurrencyService.getSupportedFiatCurrencies()).thenReject(new Error("Not implemented!"));

  return mockCurrencyService;
};