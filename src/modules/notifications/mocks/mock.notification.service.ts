import { anyString, mock, when } from "ts-mockito";
import { NotificationService } from "../notification.service";

export function getMockNotificationServiceWithDefaults(): NotificationService {
  const notificationService = mock(NotificationService);
  when(notificationService.sendNotification(anyString(), anyString())).thenResolve();
  return notificationService;
}
