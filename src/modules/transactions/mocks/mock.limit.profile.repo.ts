import { anyString, anything, mock, when } from "ts-mockito";
import { ILimitProfileRepo } from "../repo/LimitProfileRepo";
import { MongoDBLimitProfileRepo } from "../repo/MongoDBLimitProfileRepo";

export function getMockLimitProfileRepoWithDefaults(): ILimitProfileRepo {
  const limitProfileRepo = mock(MongoDBLimitProfileRepo);
  when(limitProfileRepo.addProfile(anything())).thenReject(new Error("Not implemented!"));
  when(limitProfileRepo.getProfile(anyString())).thenReject(new Error("Not implemented!"));
  return limitProfileRepo;
}
