import { anyNumber, anyString, anything, mock, when } from "ts-mockito";
import { NotificationService } from "../notification.service";

export function getMockNotificationServiceWithDefaults(): NotificationService {
  const notificationService = mock(NotificationService);
  when(notificationService.sendNotification(anyString(), anyString())).thenResolve();
  when(notificationService.updateEmployeeAllocationInBubble(anyString(), anyNumber())).thenResolve();
  return notificationService;
}
