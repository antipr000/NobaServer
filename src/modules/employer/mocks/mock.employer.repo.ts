import { anyString, anything, mock, when } from "ts-mockito";
import { IEmployerRepo } from "../repo/employer.repo";
import { SqlEmployerRepo } from "../repo/sql.employer.repo";

export function getMockEmployerRepoWithDefaults(): IEmployerRepo {
  const mockEmployerRepo: IEmployerRepo = mock(SqlEmployerRepo);

  when(mockEmployerRepo.updateEmployer(anyString(), anything())).thenReject(new Error("Method not implemented"));
  when(mockEmployerRepo.createEmployer(anything())).thenReject(new Error("Method not implemented"));
  when(mockEmployerRepo.getEmployerByID(anyString())).thenReject(new Error("Method not implemented"));
  when(mockEmployerRepo.getEmployersByBubbleID(anyString())).thenReject(new Error("Method not implemented"));
  when(mockEmployerRepo.getEmployersByReferralID(anyString())).thenReject(new Error("Method not implemented"));

  return mockEmployerRepo;
}
