import { anyString, mock, when, anything } from "ts-mockito";
import { MongoDBTokenRepo } from "../repo/MongoDBTokenRepo";
import { ITokenRepo } from "../repo/TokenRepo";

export const getMockTokenRepoWithDefaults = () => {
  const mockTokenRepo: ITokenRepo = mock(MongoDBTokenRepo);

  when(mockTokenRepo.getToken(anyString(), anyString())).thenReject(new Error("Not implemented!"));
  when(mockTokenRepo.saveToken(anything())).thenReject(new Error("Not implemented"));
  when(mockTokenRepo.deleteToken(anyString(), anyString())).thenReject(new Error("Not implemented!"));

  return mockTokenRepo;
};
