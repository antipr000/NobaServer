import { anyString, anything, mock, when } from "ts-mockito";
import { ILimitConfigurationRepo } from "../repo/LimitConfigurationRepo";
import { MongoDBLimitConfigurationRepo } from "../repo/MongoDBLimitConfigurationRepo";

export function getMockLimitConfigRepoWithDefaults(): ILimitConfigurationRepo {
  const limitConfigRepo = mock(MongoDBLimitConfigurationRepo);
  when(limitConfigRepo.addLimitConfig(anything())).thenReject(new Error("Not implemented!"));
  when(limitConfigRepo.getLimitConfig(anyString())).thenReject(new Error("Not implemented!"));
  when(limitConfigRepo.getAllLimitConfigs()).thenReject(new Error("Not implemented!"));
  return limitConfigRepo;
}
