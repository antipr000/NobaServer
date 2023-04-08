import { anyString, anything, mock, when } from "ts-mockito";
import { PomeloTransactionService } from "../pomelo.webhook.service";

export function getMockPomeloTransactionServiceWithDefaults(): PomeloTransactionService {
  const mockPomeloTransactionService = mock(PomeloTransactionService);

  when(mockPomeloTransactionService.authorizeTransaction(anything())).thenReject(new Error("Not implemented"));
  when(mockPomeloTransactionService.signTransactionAuthorizationResponse(anyString(), anything())).thenReject(
    new Error("Not implemented"),
  );
  when(mockPomeloTransactionService.adjustTransaction(anything())).thenReject(new Error("Not implemented"));
  when(mockPomeloTransactionService.signTransactionAdjustmentResponse(anyString(), anything(), anyString())).thenReject(
    new Error("Not implemented"),
  );

  return mockPomeloTransactionService;
}
