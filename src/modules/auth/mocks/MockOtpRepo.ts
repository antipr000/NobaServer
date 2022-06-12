import { anyString, mock, when } from "ts-mockito";
import { MongoDBOtpRepo } from "../repo/MongoDBOtpRepo";
import { IOTPRepo } from "../repo/OTPRepo";

export const getMockOtpRepoWithDefaults = () => {
  const mockIOtpRepo: IOTPRepo = mock(MongoDBOtpRepo);

  when(mockIOtpRepo.getOTP(anyString(), anyString())).thenReject(new Error("Not implemented!"));
  when(mockIOtpRepo.saveOTP(anyString(), anyString())).thenReject(new Error("Not implemented!"));

  return mockIOtpRepo;
};
