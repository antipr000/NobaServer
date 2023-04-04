import { anyString, anything, mock, when } from "ts-mockito";
import { PomeloService } from "../pomelo.service";

export function getMockPomeloServiceWithDefaults(): PomeloService {
  const mockPomeloService = mock(PomeloService);

  when(mockPomeloService.createCard(anything(), anyString())).thenReject(new Error("Not implemented"));

  return mockPomeloService;
}
