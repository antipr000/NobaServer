import { Injectable } from "@nestjs/common";
import { Repo } from "../../../core/infra/Repo";
import { PartnerAdmin } from "../domain/PartnerAdmin";

@Injectable()
export abstract class IPartnerAdminRepo implements Repo<any> {
    abstract getPartnerAdmin(partnerAdminId: string): Promise<PartnerAdmin>;
    abstract getPartnerAdminUsingEmail(emailID: string): Promise<PartnerAdmin>;
    abstract addPartnerAdmin(partnerAdmin: PartnerAdmin): Promise<PartnerAdmin>;
    abstract getAllAdminsForPartner(partnerId: string): Promise<PartnerAdmin[]>;
    abstract removePartnerAdmin(partnerAdminId: string): void;
    abstract updatePartnerAdmin(partnerAdmin: PartnerAdmin): Promise<PartnerAdmin>;
}