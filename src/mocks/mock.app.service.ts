import { AppService } from "../app.service";
import { mock, when } from "ts-mockito";

export function getMockAppServiceWithDefaults(): AppService {
  const mockAppService = mock(AppService);

  return mockAppService;
}
