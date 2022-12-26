import { anyString, anything, mock, when } from "ts-mockito";
import { IVerificationDataRepo } from "../repos/IVerificationDataRepo";
import { SQLVerificationDataRepo } from "../repos/SQLVerificationDataRepo";

export function getMockVerificationRepoWithDefaults(): IVerificationDataRepo {
  const mockVerificationRepo = mock(SQLVerificationDataRepo);
  when(mockVerificationRepo.saveVerificationData(anything())).thenReject(new Error("Method not implemented"));
  when(mockVerificationRepo.getVerificationData(anyString())).thenReject(new Error("Method not implemented"));

  return mockVerificationRepo;
}
