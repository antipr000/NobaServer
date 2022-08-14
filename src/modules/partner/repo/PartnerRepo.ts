import { Repo } from "../../../core/infra/Repo";
import { Partner } from "../domain/Partner";

export interface IPartnerRepo extends Repo<any> {
  getPartner(partnerId: string): Promise<Partner>;
  addPartner(partner: Partner): Promise<Partner>;
  updatePartner(partner: Partner): Promise<Partner>;
  getPartnerFromApiKey(apiKey: string): Promise<Partner>;
}
