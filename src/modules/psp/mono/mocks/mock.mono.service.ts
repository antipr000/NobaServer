import { anyString, anything, mock, when } from "ts-mockito";
import { MonoService } from "../mono.service";

export function getMockMonoServiceWithDefaults(): MonoService {
  const mockMonoService: MonoService = mock(MonoService);

  when(mockMonoService.createMonoTransaction(anything())).thenReject(new Error("Method not implemented"));
  when(mockMonoService.getTransactionByCollectionLinkID(anyString())).thenReject(new Error("Method not implemented"));
  when(mockMonoService.getTransactionByNobaTransactionID(anyString())).thenReject(new Error("Method not implemented"));

  return mockMonoService;
}
