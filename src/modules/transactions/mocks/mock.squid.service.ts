import { when, mock, anyString, anyNumber } from "ts-mockito";
import { SquidService } from "../squid.service";

export function getMockSquidServiceWithDefaults(): SquidService {
  const squidService = mock(SquidService);

  when(squidService.getIntermediaryLeg()).thenReturn("USDC.POLYGON");
  when(squidService.performRouting(anyString(), anyNumber(), anyString())).thenReject(new Error("Not implemented!"));

  return squidService;
}
