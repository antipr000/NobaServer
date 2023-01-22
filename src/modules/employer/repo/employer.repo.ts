import { Employer, EmployerCreateRequest, EmployerUpdateRequest } from "../domain/Employer";

export interface IEmployerRepo {
  createEmployer(request: EmployerCreateRequest): Promise<Employer>;
  updateEmployer(id: string, request: EmployerUpdateRequest): Promise<Employer>;
  getEmployerByID(id: string): Promise<Employer>;
  getEmployerByReferralID(referralID: string): Promise<Employer>;
  getEmployerByBubbleID(bubbleID: string): Promise<Employer>;
}
