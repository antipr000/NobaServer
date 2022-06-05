import { Injectable } from "@nestjs/common";
import { Repo } from "../../../core/infra/Repo";
import { PartnerAdmin } from "../domain/PartnerAdmin";
import { Result } from "../../../core/logic/Result";

@Injectable()
export abstract class IPartnerAdminRepo implements Repo<any> {
    abstract getPartnerAdmin(partnerAdminId: string): Promise<Result<PartnerAdmin>>;
    abstract getPartnerAdminUsingEmail(emailID: string): Promise<Result<PartnerAdmin>>;
    abstract addPartnerAdmin(partnerAdmin: PartnerAdmin): Promise<PartnerAdmin>;
    abstract getAllAdminsForPartner(partnerId: string): Promise<PartnerAdmin[]>;
    abstract removePartnerAdmin(partnerAdminId: string): Promise<void>;
    abstract updatePartnerAdmin(partnerAdmin: PartnerAdmin): Promise<PartnerAdmin>;
}