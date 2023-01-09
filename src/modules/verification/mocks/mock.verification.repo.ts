import { anyString, anything, mock, when } from "ts-mockito";
import { IVerificationDataRepo } from "../repos/verification.data.repo";
import { SQLVerificationDataRepo } from "../repos/sql.verification.data.repo";

export function getMockVerificationRepoWithDefaults(): IVerificationDataRepo {
  const mockVerificationRepo = mock(SQLVerificationDataRepo);
  when(mockVerificationRepo.saveVerificationData(anything())).thenReject(new Error("Method not implemented"));
  when(mockVerificationRepo.getVerificationData(anyString())).thenReject(new Error("Method not implemented"));

  return mockVerificationRepo;
}
