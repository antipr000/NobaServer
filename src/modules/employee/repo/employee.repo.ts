import { Employee, EmployeeCreateRequest, EmployeeUpdateRequest } from "../domain/Employee";

export interface IEmployeeRepo {
  createEmployee(request: EmployeeCreateRequest): Promise<Employee>;
  updateEmployee(id: string, request: EmployeeUpdateRequest): Promise<Employee>;
  getEmployeeByID(id: string): Promise<Employee>;
  getEmployeesForConsumerID(consumerID: string): Promise<Employee[]>;
}
