import { anyString, mock, when, anything } from "ts-mockito";
import { ITokenRepo } from "../repo/token.repo";
import { SQLTokenRepo } from "../repo/sql.token.repo";

export const getMockTokenRepoWithDefaults = () => {
  const mockTokenRepo: ITokenRepo = mock(SQLTokenRepo);

  when(mockTokenRepo.getToken(anyString(), anyString())).thenReject(new Error("Not implemented!"));
  when(mockTokenRepo.saveToken(anything())).thenReject(new Error("Not implemented"));
  when(mockTokenRepo.deleteToken(anyString(), anyString())).thenReject(new Error("Not implemented!"));

  return mockTokenRepo;
};
