import { anyNumber, anyString, anything, mock, when } from "ts-mockito";
import { EmployeeService } from "../employee.service";

export function getMockEmployeeServiceWithDefaults(): EmployeeService {
  const mockEmployeeService: EmployeeService = mock(EmployeeService);

  when(mockEmployeeService.createEmployee(anyNumber(), anyString(), anyString())).thenReject(
    new Error("Method not implemented"),
  );
  when(mockEmployeeService.linkEmployee(anyString(), anyString())).thenReject(new Error("Method not implemented"));
  when(mockEmployeeService.updateEmployee(anyString(), anything())).thenReject(new Error("Method not implemented"));
  when(mockEmployeeService.getEmployeeByID(anyString())).thenReject(new Error("Method not implemented"));
  when(mockEmployeeService.getEmployeesForConsumerID(anyString())).thenReject(new Error("Method not implemented"));
  when(mockEmployeeService.getEmployeeByConsumerAndEmployerID(anyString(), anyString())).thenReject(
    new Error("Method not implemented"),
  );
  when(mockEmployeeService.updateAllocationAmountsForNewMaxAllocationPercent(anyString(), anyNumber())).thenReject(
    new Error("Method not implemented"),
  );
  when(mockEmployeeService.getFilteredEmployees(anything())).thenReject(new Error("Method not implemented"));

  return mockEmployeeService;
}
