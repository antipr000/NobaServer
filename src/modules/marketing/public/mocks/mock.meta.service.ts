import { anything, mock, when } from "ts-mockito";
import { MetaService } from "../meta.service";

export function getMockMetaServiceWithDefaults(): MetaService {
  const mockMetaService: MetaService = mock(MetaService);

  when(mockMetaService.raiseEvent(anything())).thenReject(new Error("Method not implemented"));

  return mockMetaService;
}
