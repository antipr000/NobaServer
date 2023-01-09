import { anyString, anything, mock, when } from "ts-mockito";
import { ILimitConfigurationRepo } from "../repo/limitconfiguration.repo";
import { SQLLimitConfigurationRepo } from "../repo/sql.limitconfiguration.repo";

export function getMockLimitConfigRepoWithDefaults(): ILimitConfigurationRepo {
  const limitConfigRepo = mock(SQLLimitConfigurationRepo);
  when(limitConfigRepo.addLimitConfig(anything())).thenReject(new Error("Not implemented!"));
  when(limitConfigRepo.getLimitConfig(anyString())).thenReject(new Error("Not implemented!"));
  when(limitConfigRepo.getAllLimitConfigs()).thenReject(new Error("Not implemented!"));
  return limitConfigRepo;
}
