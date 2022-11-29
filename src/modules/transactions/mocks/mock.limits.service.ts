import { anyNumber, anyString, anything, mock, when } from "ts-mockito";
import { LimitsService } from "../limits.service";

export function getMockLimitsServiceWithDefaults(): LimitsService {
  const limitsService = mock(LimitsService);

  when(limitsService.canMakeTransaction(anything(), anyNumber(), anyString(), anyString(), anyString())).thenReject(
    new Error("Not implemented!"),
  );
  when(limitsService.getConsumerLimits(anything(), anyString(), anyString(), anyString())).thenReject(
    new Error("Not implemented!"),
  );
  when(limitsService.getLimits(anything(), anyString(), anyString())).thenReject(new Error("Not implemented!"));
  return limitsService;
}
