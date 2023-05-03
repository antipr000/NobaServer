import { EmployeeStatus } from "../domain/Employee";

export class UpdateEmployeeRequestDTO {
  consumerID?: string;
  allocationAmount?: number;
  salary?: number;
  email?: string;
  status?: EmployeeStatus;
  lastInviteSentTimestamp?: Date;
}

export class CreateEmployeeRequestDTO {
  consumerID?: string;
  allocationAmount: number;
  employerID: string;
  salary?: number;
  email?: string;
}
