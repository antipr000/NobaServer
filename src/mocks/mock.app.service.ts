import { AppService } from "../app.service";
import { mock } from "ts-mockito";

export function getMockAppServiceWithDefaults(): AppService {
  const mockAppService = mock(AppService);

  return mockAppService;
}
