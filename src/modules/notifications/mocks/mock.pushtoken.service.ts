import { anyString, mock, when } from "ts-mockito";
import { PushTokenService } from "../push.token.service";

export function getMockPushTokenServiceWithDefaults(): PushTokenService {
  const mockPushTokenService = mock(PushTokenService);
  when(mockPushTokenService.subscribeToPushNotifications(anyString(), anyString())).thenReject(
    new Error("Not implemented"),
  );
  when(mockPushTokenService.unsubscribeFromPushNotifications(anyString(), anyString())).thenReject(
    new Error("Not implemented"),
  );
  when(mockPushTokenService.getPushTokensForConsumer(anyString())).thenReject(new Error("Not implemented"));
  return mockPushTokenService;
}
