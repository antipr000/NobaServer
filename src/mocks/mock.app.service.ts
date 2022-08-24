import { AppService } from "../app.service";
import { mock, when } from "ts-mockito";

export function getMockAppServiceWithDefaults(): AppService {
  const mockAppService = mock(AppService);

  when(mockAppService.getSupportedCryptocurrencies()).thenReject(new Error("Method not implemented"));
  when(mockAppService.getSupportedFiatCurrencies()).thenReject(new Error("Method not implemented"));

  return mockAppService;
}
