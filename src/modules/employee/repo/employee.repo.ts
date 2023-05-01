import { PaginatedResult } from "../../../core/infra/PaginationTypes";
import { Employee, EmployeeCreateRequest, EmployeeUpdateRequest } from "../domain/Employee";
import { EmployeeFilterOptionsDTO } from "../dto/employee.filter.options.dto";

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
  getFilteredEmployees(filterOptions: EmployeeFilterOptionsDTO): Promise<PaginatedResult<Employee>>;
  getActiveEmployeeByEmail(emailID: string): Promise<Employee>;
}
