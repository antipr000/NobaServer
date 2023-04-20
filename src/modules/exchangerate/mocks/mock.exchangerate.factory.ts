import { anyString, anything, mock, when } from "ts-mockito";
import { ExchangeRateClientFactory } from "../factory/exchangerate.factory";

export const getMockExchangeRateClientFactoryWithDefaults = () => {
  const mockExchangeRateClientFactory = mock(ExchangeRateClientFactory);
  when(mockExchangeRateClientFactory.getExchangeRateClient(anything())).thenReject(new Error("Method not implemented"));
  when(mockExchangeRateClientFactory.getExchangeRateClientByCurrencyPair(anyString(), anyString())).thenReject(
    new Error("Method not implemented"),
  );
  return mockExchangeRateClientFactory;
};
