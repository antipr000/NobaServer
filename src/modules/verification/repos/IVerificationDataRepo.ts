import { Repo } from "../../../core/infra/Repo";
import { VerificationData } from "../domain/VerificationData";

export interface IVerificationDataRepo extends Repo<any> {
  saveVerificationData(verificationData: VerificationData): Promise<VerificationData>;
  getVerificationData(id: string): Promise<VerificationData>;
}
