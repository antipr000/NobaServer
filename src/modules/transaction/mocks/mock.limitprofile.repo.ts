import { anyString, anything, mock, when } from "ts-mockito";
import { ILimitProfileRepo } from "../repo/limitprofile.repo";
import { SQLLimitProfileRepo } from "../repo/sql.limitprofile.repo";

export function getMockLimitProfileRepoWithDefaults(): ILimitProfileRepo {
  const limitProfileRepo = mock(SQLLimitProfileRepo);
  when(limitProfileRepo.addProfile(anything())).thenReject(new Error("Not implemented!"));
  when(limitProfileRepo.getProfile(anyString())).thenReject(new Error("Not implemented!"));
  return limitProfileRepo;
}
