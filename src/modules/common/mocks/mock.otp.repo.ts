import { anyNumber, anyString, anything, mock, when } from "ts-mockito";
import { IOTPRepo } from "../repo/otp.repo";
import { SQLOTPRepo } from "../repo/sql.otp.repo";

export function getMockOTPRepoWithDefaults(): IOTPRepo {
  const mockOTPRepo: IOTPRepo = mock(SQLOTPRepo);
  when(mockOTPRepo.getOTP(anyString(), anything())).thenReject(new Error("Method not implemented"));
  when(mockOTPRepo.saveOTP(anyString(), anyNumber(), anything())).thenReject(new Error("Method not implemented"));
  when(mockOTPRepo.deleteOTP(anyString())).thenReject(new Error("Method not implemented"));
  when(mockOTPRepo.deleteAllOTPsForIdentifier(anyString(), anything())).thenReject(new Error("Method not implemented"));
  when(mockOTPRepo.deleteAllExpiredOTPs()).thenReject(new Error("Method not implemented"));
  return mockOTPRepo;
}
