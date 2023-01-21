import { anyString, anything, mock, when } from "ts-mockito";
import { IEmployeeRepo } from "../repo/employee.repo";
import { SqlEmployeeRepo } from "../repo/sql.employee.repo";

export function getMockEmployeeRepoWithDefaults(): IEmployeeRepo {
  const mockEmployeeRepo: IEmployeeRepo = mock(SqlEmployeeRepo);

  when(mockEmployeeRepo.updateEmployee(anyString(), anything())).thenReject(new Error("Method not implemented"));
  when(mockEmployeeRepo.createEmployee(anything())).thenReject(new Error("Method not implemented"));
  when(mockEmployeeRepo.getEmployeeByID(anyString())).thenReject(new Error("Method not implemented"));
  when(mockEmployeeRepo.getEmployeesForConsumerID(anyString())).thenReject(new Error("Method not implemented"));
  when(mockEmployeeRepo.getEmployeeByConsumerAndEmployerID(anyString(), anyString())).thenReject(
    new Error("Method not implemented"),
  );

  return mockEmployeeRepo;
}
