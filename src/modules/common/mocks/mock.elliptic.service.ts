import { anything, mock, when } from "ts-mockito";
import { EllipticService } from "../elliptic.service";

export function getMockEllipticServiceWithDefaults() {
  const ellipticService = mock(EllipticService);
  when(ellipticService.transactionAnalysis(anything())).thenReject(new Error("Not implemented!"));
  return ellipticService;
}
