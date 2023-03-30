import { anything, mock, when } from "ts-mockito";
import { PomeloWebhookMapper } from "../transaction/pomelo.webhook.mapper";

export function getMockPomeloWebhookMapperWithDefaults(): PomeloWebhookMapper {
  const mockPomeloWebhookMapper = mock(PomeloWebhookMapper);

  when(mockPomeloWebhookMapper.convertToPomeloTransactionAuthzRequest(anything(), anything())).thenReject(
    new Error("Not implemented"),
  );

  return mockPomeloWebhookMapper;
}
