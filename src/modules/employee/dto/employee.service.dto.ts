import { EmployeeStatus } from "../domain/Employee";

export class UpdateEmployeeRequestDTO {
  consumerID?: string;
  allocationAmount?: number;
  salary?: number;
  email?: string;
  status?: EmployeeStatus;
}
