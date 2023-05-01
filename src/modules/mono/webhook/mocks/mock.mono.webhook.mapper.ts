import { anyString, anything, mock, when } from "ts-mockito";
import { MonoWebhookMappers } from "../mono.webhook.mapper";

export function getMockMonoWebhookHandlersWithDefaults(): MonoWebhookMappers {
  const mockMonoWebhookHandlers: MonoWebhookMappers = mock(MonoWebhookMappers);

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
