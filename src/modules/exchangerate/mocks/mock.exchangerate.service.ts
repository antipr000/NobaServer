import { anyString, anything, mock, when } from "ts-mockito";
import { ExchangeRateService } from "../exchangerate.service";

export function getMockExchangeRateServiceWithDefaults() {
  const mockExchangeRateService = mock(ExchangeRateService);
  when(mockExchangeRateService.createExchangeRate(anything())).thenReject(new Error("Not implemented!"));
  when(mockExchangeRateService.getExchangeRateForCurrencyPair(anyString(), anyString())).thenReject(
    new Error("Not implemented"),
  );
  return mockExchangeRateService;
}
