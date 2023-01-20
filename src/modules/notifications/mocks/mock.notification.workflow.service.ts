import { anyString, anything, mock, when } from "ts-mockito";
import { NotificationWorkflowService } from "../notification.workflow.service";

export function getMockNotificationWorkflowServiceWithDefaults(): NotificationWorkflowService {
  const notificationWorkflowService = mock(NotificationWorkflowService);
  when(notificationWorkflowService.sendNotification(anything(), anyString())).thenResolve();

  return notificationWorkflowService;
}
