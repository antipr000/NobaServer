import { anyNumber, anyString, anything, mock, when } from "ts-mockito";
import { CircleService } from "../circle.service";

export function getMockCircleServiceWithDefaults(): CircleService {
  const circleService = mock(CircleService);

  when(circleService.creditWalletBalance(anyString(), anyString(), anyNumber())).thenReject(
    new Error("Not implemented!"),
  );
  when(circleService.debitWalletBalance(anyString(), anyString(), anyNumber())).thenReject(
    new Error("Not implemented!"),
  );
  when(circleService.getMasterWalletID()).thenReject(new Error("Not implemented!"));
  when(circleService.getOrCreateWallet(anyString())).thenReject(new Error("Not implemented!"));
  when(circleService.getWalletBalance(anyString())).thenReject(new Error("Not implemented!"));

  return circleService;
}
