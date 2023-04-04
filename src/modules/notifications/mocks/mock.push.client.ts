import { anything, mock, when } from "ts-mockito";
import { PushClient } from "../push/push.client";
import { ExpoPushClient } from "../push/expo.push.client";

export function getMockPushClientWithDefaults(): PushClient {
  const mockPushClient = mock(ExpoPushClient);

  when(mockPushClient.sendPushNotification(anything())).thenReject(new Error("Not implemented"));

  return mockPushClient;
}
