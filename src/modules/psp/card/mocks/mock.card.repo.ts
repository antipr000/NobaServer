import { anyString, mock, when } from "ts-mockito";
import { SQLNobaCardRepo } from "../repos/sql.card.repo";
import { NobaCardRepo } from "../repos/card.repo";

export function getMockCardRepoWithDefaults(): NobaCardRepo {
  const mockCardRepo = mock(SQLNobaCardRepo);

  when(mockCardRepo.getCardByID(anyString())).thenReject(new Error("Not implemented"));
  when(mockCardRepo.getCardsByConsumerID(anyString())).thenReject(new Error("Not implemented"));
  return mockCardRepo;
}
