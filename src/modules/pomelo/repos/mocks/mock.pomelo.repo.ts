import { anyString, anything, mock, when } from "ts-mockito";
import { PomeloRepo } from "../pomelo.repo";
import { SQLPomeloRepo } from "../sql.pomelo.repo";

export function getMockPomeloRepoWithDefaults(): PomeloRepo {
  const pomeloRepo = mock(SQLPomeloRepo);

  when(pomeloRepo.createPomeloUser(anything())).thenReject(new Error("Not implemented"));
  when(pomeloRepo.getPomeloUserByConsumerID(anyString())).thenReject(new Error("Not implemented"));
  when(pomeloRepo.getPomeloUserByPomeloUserID(anyString())).thenReject(new Error("Not implemented"));

  when(pomeloRepo.createPomeloCard(anything())).thenReject(new Error("Not implemented"));
  when(pomeloRepo.updatePomeloCard(anything())).thenReject(new Error("Not implemented"));
  when(pomeloRepo.getPomeloCardByNobaCardID(anyString())).thenReject(new Error("Not implemented"));
  when(pomeloRepo.getPomeloCardByPomeloCardID(anyString())).thenReject(new Error("Not implemented"));
  when(pomeloRepo.getNobaConsumerIDHoldingPomeloCard(anyString(), anyString())).thenReject(
    new Error("Not implemented"),
  );

  when(pomeloRepo.createPomeloTransaction(anything())).thenReject(new Error("Not implemented"));
  when(pomeloRepo.getPomeloTransactionByNobaTransactionID(anyString())).thenReject(new Error("Not implemented"));
  when(pomeloRepo.getPomeloTransactionByPomeloIdempotencyKey(anyString())).thenReject(new Error("Not implemented"));
  when(pomeloRepo.updatePomeloTransactionStatus(anyString(), anyString())).thenReject(new Error("Not implemented"));
  when(pomeloRepo.getPomeloTransactionByPomeloTransactionID(anyString())).thenReject(new Error("Not implemented"));
  when(pomeloRepo.getPomeloUserTransactionsForSettlementDate(anyString(), anyString())).thenReject(
    new Error("Not implemented"),
  );

  return pomeloRepo;
}
