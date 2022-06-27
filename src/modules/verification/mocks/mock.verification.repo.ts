import { anyString, anything, mock, when } from "ts-mockito";
import { IVerificationDataRepo } from "../repos/IVerificationDataRepo";
import { MongoDBVerificationDataRepo } from "../repos/MongoDBVerificationDataRepo";

export function getMockVerificationRepoWithDefaults(): IVerificationDataRepo {
  const mockVerificationRepo = mock(MongoDBVerificationDataRepo);
  when(mockVerificationRepo.saveVerificationData(anything())).thenReject(new Error("Method not implemented"));
  when(mockVerificationRepo.getVerificationData(anyString())).thenReject(new Error("Method not implemented"));

  return mockVerificationRepo;
}
