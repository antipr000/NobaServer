import { anyString, anything, mock, when } from "ts-mockito";
import { NotificationWorkflowService } from "../notification.workflow.service";

export function getMockNotificationWorkflowServiceWithDefaults(): NotificationWorkflowService {
  const notificationWorkflowService = mock(NotificationWorkflowService);
  when(notificationWorkflowService.sendTransactionNotification(anything(), anyString())).thenResolve();
  when(notificationWorkflowService.sendPayrollStatusUpdateNotification(anyString(), anything())).thenResolve();
  return notificationWorkflowService;
}
