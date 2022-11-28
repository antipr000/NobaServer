import { when, mock, anything, anyNumber } from "ts-mockito";
import { LimitsService } from "../limits.service";

export function getMockLimitServiceWithDefaults() {
  const limitService = mock(LimitsService);

  when(limitService.canMakeTransaction(anything(), anyNumber())).thenReject(new Error("Not implemented!"));
  when(limitService.getConsumerLimits(anything())).thenReject(new Error("Not implemented!"));
  when(limitService.getLimits(anything())).thenReject(new Error("Not implemented!"));
  return limitService;
}
