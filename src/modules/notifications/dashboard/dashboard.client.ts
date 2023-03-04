import { NewEmployeeRegisterRequest } from "../domain/dashboard.client.dto";

export interface DashboardClient {
  registerNewEmployee(newEmployeeRegisterRequest: NewEmployeeRegisterRequest): Promise<void>;
  updateEmployeeAllocationAmount(nobaEmployeeID: string, allocationAmountInPesos: number): Promise<void>;
}
