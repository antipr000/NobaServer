import { anyString, anything, mock, when } from "ts-mockito";
import { MonoWebhookHandlers } from "../mono.webhook";

export function getMockMonoWebhookHandlersWithDefaults(): MonoWebhookHandlers {
  const mockMonoWebhookHandlers: MonoWebhookHandlers = mock(MonoWebhookHandlers);

  when(mockMonoWebhookHandlers.convertCollectionLinkCredited(anything(), anyString())).thenReject(
    new Error("Method not implemented"),
  );
  when(mockMonoWebhookHandlers.convertBankTransferApproved(anything(), anyString())).thenReject(
    new Error("Method not implemented"),
  );
  when(mockMonoWebhookHandlers.convertBankTransferRejected(anything(), anyString())).thenReject(
    new Error("Method not implemented"),
  );
  return mockMonoWebhookHandlers;
}
