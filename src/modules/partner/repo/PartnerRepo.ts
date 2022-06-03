import { Injectable } from "@nestjs/common";
import { Repo } from "../../../core/infra/Repo";
import { Partner } from "../domain/Partner";

@Injectable()
export abstract class IPartnerRepo implements Repo<any> {
    abstract getPartner(partnerId: string): Promise<Partner>;
    abstract addPartner(partner: Partner): Promise<Partner>;
    abstract updateTakeRate(partnerId: string, takeRate: number): Promise<Partner>;
    abstract updatePartner(partner: Partner): Promise<Partner>;
}