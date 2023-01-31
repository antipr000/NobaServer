import { anyNumber, anyString, mock, when } from "ts-mockito";
import { EmployeeService } from "../employee.service";

export function getMockEmployeeServiceWithDefaults(): EmployeeService {
  const mockEmployeeService: EmployeeService = mock(EmployeeService);

  when(mockEmployeeService.createEmployee(anyNumber(), anyString(), anyString())).thenReject(
    new Error("Method not implemented"),
  );
  when(mockEmployeeService.updateEmployee(anyString(), anyNumber())).thenReject(new Error("Method not implemented"));
  when(mockEmployeeService.getEmployeeByID(anyString())).thenReject(new Error("Method not implemented"));
  when(mockEmployeeService.getEmployeesForConsumerID(anyString())).thenReject(new Error("Method not implemented"));
  when(mockEmployeeService.getEmployeeByConsumerAndEmployerID(anyString(), anyString())).thenReject(
    new Error("Method not implemented"),
  );

  return mockEmployeeService;
}