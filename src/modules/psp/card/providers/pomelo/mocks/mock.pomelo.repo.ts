import { anyString, anything, mock, when } from "ts-mockito";
import { PomeloRepo } from "../repos/pomelo.repo";
import { SQLPomeloRepo } from "../repos/sql.pomelo.repo";

export function getMockPomeloRepoWithDefaults(): PomeloRepo {
  const pomeloRepo = mock(SQLPomeloRepo);

  when(pomeloRepo.createPomeloUser(anything())).thenReject(new Error("Not implemented"));
  when(pomeloRepo.getPomeloUserByConsumerID(anyString())).thenReject(new Error("Not implemented"));
  when(pomeloRepo.getPomeloUserByPomeloID(anyString())).thenReject(new Error("Not implemented"));

  return pomeloRepo;
}