import { anyString, anything, mock, when } from "ts-mockito";
import { ExchangeRateService } from "../exchangerate.service";
import { ZeroHashService } from "../zerohash.service";

export function getMockExchangeRateServiceWithDefaults(): ExchangeRateService {
  const mockExchangeRateService = mock(ExchangeRateService);

  when(mockExchangeRateService.getQuote(anyString(), anyString(), anything(), anything())).thenReject(new Error("Method not implemented"));
  when(mockExchangeRateService.priceInFiat(anyString(), anyString())).thenReject(new Error("Method not implemented"));
  when(mockExchangeRateService.processingFee(anyString(), anyString(), anything())).thenReject(new Error("Method not implemented"));

  return mockExchangeRateService;
}