import { anyString, anything, mock, when } from "ts-mockito";
import { IMonoRepo } from "../mono.repo";
import { SqlMonoRepo } from "../sql.mono.repo";

export function getMockMonoRepoWithDefaults(): IMonoRepo {
  const mockMonoRepo: IMonoRepo = mock(SqlMonoRepo);

  when(mockMonoRepo.updateMonoTransaction(anyString(), anything())).thenReject(new Error("Method not implemented"));
  when(mockMonoRepo.createMonoTransaction(anything())).thenReject(new Error("Method not implemented"));
  when(mockMonoRepo.getMonoTransactionByCollectionLinkID(anyString())).thenReject(new Error("Method not implemented"));
  when(mockMonoRepo.getMonoTransactionByNobaTransactionID(anyString())).thenReject(new Error("Method not implemented"));
  when(mockMonoRepo.getMonoTransactionByTransferID(anyString())).thenReject(new Error("Method not implemented"));

  return mockMonoRepo;
}
