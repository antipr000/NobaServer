import { anyString, anything, mock, when } from "ts-mockito";
import { MonoWebhookService } from "../mono.webhook.service";

export function getMockMonoWebhookServiceWithDefaults(): MonoWebhookService {
  const mockMonoWebhookService: MonoWebhookService = mock(MonoWebhookService);

  when(mockMonoWebhookService.processWebhookEvent(anything(), anyString())).thenReject(
    new Error("Method not implemented"),
  );

  return mockMonoWebhookService;
}
