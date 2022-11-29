import { anyNumber, anyString, anything, mock, when } from "ts-mockito";
import { LimitsService } from "../limits.service";

export function getMockLimitsServiceWithDefaults(): LimitsService {
  const limitsService = mock(LimitsService);

  when(limitsService.canMakeTransaction(anything(), anyNumber(), anything())).thenReject(new Error("Not implemented!"));
  when(limitsService.getConsumerLimits(anything(), anything())).thenReject(new Error("Not implemented!"));
  when(limitsService.getLimits(anything(), anyString(), anyString())).thenReject(new Error("Not implemented!"));
  return limitsService;
}
