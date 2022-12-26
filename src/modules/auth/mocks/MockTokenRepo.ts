import { anyString, mock, when, anything } from "ts-mockito";
import { ITokenRepo } from "../repo/TokenRepo";
import { SQLTokenRepo } from "../repo/SQLTokenRepo";

export const getMockTokenRepoWithDefaults = () => {
  const mockTokenRepo: ITokenRepo = mock(SQLTokenRepo);

  when(mockTokenRepo.getToken(anyString(), anyString())).thenReject(new Error("Not implemented!"));
  when(mockTokenRepo.saveToken(anything())).thenReject(new Error("Not implemented"));
  when(mockTokenRepo.deleteToken(anyString(), anyString())).thenReject(new Error("Not implemented!"));

  return mockTokenRepo;
};
