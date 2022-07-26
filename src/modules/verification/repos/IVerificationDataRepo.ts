import { Repo } from "../../../core/infra/Repo";
import { VerificationData, VerificationDataProps } from "../domain/VerificationData";

export interface IVerificationDataRepo extends Repo<any> {
  saveVerificationData(verificationData: VerificationData): Promise<VerificationData>;
  getVerificationData(id: string): Promise<VerificationData>;
  updateVerificationData(verificationData: VerificationData): Promise<VerificationData>;
  getSessionKeyFromFilters(filters: Partial<VerificationDataProps>): Promise<string>;
}
