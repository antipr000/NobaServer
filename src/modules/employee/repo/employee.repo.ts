import { Employee, EmployeeCreateRequest, EmployeeUpdateRequest } from "../domain/Employee";

export interface IEmployeeRepo {
  createEmployee(request: EmployeeCreateRequest): Promise<Employee>;
  updateEmployee(id: string, request: EmployeeUpdateRequest): Promise<Employee>;
  getEmployeeByID(id: string, fetchEmployerDetails?: boolean): Promise<Employee>;
  getEmployeesForConsumerID(consumerID: string, fetchEmployerDetails?: boolean): Promise<Employee[]>;
  getEmployeeByConsumerAndEmployerID(
    consumerID: string,
    employerID: string,
    fetchEmployerDetails?: boolean,
  ): Promise<Employee>;
  getEmployeesForEmployer(employerID: string, fetchEmployerDetails?: boolean): Promise<Employee[]>;
  getEmployeesForEmployerWithConsumer(employerID: string): Promise<Employee[]>;
}
