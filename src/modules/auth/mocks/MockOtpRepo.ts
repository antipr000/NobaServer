import { anyString, mock, when, anything, anyNumber } from "ts-mockito";
import { MongoDBOtpRepo } from "../repo/MongoDBOtpRepo";
import { IOTPRepo } from "../repo/OTPRepo";

export const getMockOtpRepoWithDefaults = () => {
  const mockIOtpRepo: IOTPRepo = mock(MongoDBOtpRepo);

  when(mockIOtpRepo.getOTP(anyString(), anyString(), anyString(), anyString())).thenReject(
    new Error("Not implemented!"),
  );
  when(mockIOtpRepo.getAllOTPsForUser(anyString(), anyString(), anyString())).thenReject(new Error("Not implemented"));
  when(mockIOtpRepo.saveOTP(anyString(), anyNumber(), anyString(), anyString(), anyString(), anyNumber())).thenReject(
    new Error("Not implemented!"),
  );
  when(mockIOtpRepo.deleteOTP(anyString())).thenReject(new Error("Not implemented!"));
  when(mockIOtpRepo.deleteAllOTPsForUser(anyString(), anyString())).thenReject(new Error("Not implemented!"));
  when(mockIOtpRepo.saveOTPObject(anything())).thenReject(new Error("Not implemented!"));

  return mockIOtpRepo;
};
