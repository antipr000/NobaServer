import { anyNumber, mock, when } from "ts-mockito";
import { ExchangeRateIOExchangeRateClient } from "../clients/exchangerateio.exchangerate.client";

export function getMockExchangeRateIOExchangeRateClientWithDefaults(): ExchangeRateIOExchangeRateClient {
  const mockExchangeRateClientFactory = mock(ExchangeRateIOExchangeRateClient);
  when(mockExchangeRateClientFactory.getHealth()).thenReject(new Error("Not implemented"));
  when(mockExchangeRateClientFactory.getExchangeRate(anyNumber(), anyNumber())).thenReject(
    new Error("Not implemented"),
  );
  return mockExchangeRateClientFactory;
}
