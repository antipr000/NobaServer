import { anything, mock, when } from "ts-mockito";
import { TransactionMappingService } from "../mapper/transaction.mapper.service";

export function getMockTransactionMapperServiceWithDefaults(): TransactionMappingService {
  const mockTransactionMappingService: TransactionMappingService = mock(TransactionMappingService);

  when(mockTransactionMappingService.toTransactionDTO(anything())).thenReject(new Error("Method not implemented"));
  return mockTransactionMappingService;
}
