import { Repo } from "../../../core/infra/Repo";
import { Result } from "../../../core/logic/Result";
import { PartnerAdmin } from "../domain/PartnerAdmin";

export interface IPartnerAdminRepo extends Repo<any> {
  getPartnerAdmin(partnerAdminId: string): Promise<Result<PartnerAdmin>>;
  getPartnerAdminUsingEmail(emailID: string): Promise<Result<PartnerAdmin>>;
  addPartnerAdmin(partnerAdmin: PartnerAdmin): Promise<PartnerAdmin>;
  getAllAdminsForPartner(partnerId: string): Promise<PartnerAdmin[]>;
  removePartnerAdmin(partnerAdminId: string): Promise<void>;
  updatePartnerAdmin(partnerAdmin: PartnerAdmin): Promise<PartnerAdmin>;
}
