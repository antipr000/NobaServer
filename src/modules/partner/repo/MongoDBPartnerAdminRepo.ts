import { DBProvider } from "../../../infraproviders/DBProvider";
import { PartnerAdmin } from "../domain/PartnerAdmin";
import { Injectable } from "@nestjs/common";
import { IPartnerAdminRepo } from "./PartnerAdminRepo";
 


//TODO figure out a way to create indices using joi schema and joigoose
@Injectable()
export class MongoDBPartnerAdminRepo implements IPartnerAdminRepo {

    constructor(private readonly dbProvider: DBProvider) {
        
    }

    getPartnerAdmin(partnerAdminId: string): Promise<PartnerAdmin> {
        throw new Error("Method not implemented.");
    }
    getPartnerAdminUsingEmail(emailID: string): Promise<PartnerAdmin> {
        throw new Error("Method not implemented.");
    }
    addPartnerAdmin(partnerAdmin: PartnerAdmin): Promise<PartnerAdmin> {
        throw new Error("Method not implemented.");
    }
    getAllAdminsForPartner(partnerId: string): Promise<PartnerAdmin[]> {
        throw new Error("Method not implemented.");
    }
    removePartnerAdmin(partnerAdminId: string): void {
        throw new Error("Method not implemented.");
    }
    updatePartnerAdmin(partnerAdmin: PartnerAdmin): Promise<PartnerAdmin> {
        throw new Error("Method not implemented.");
    }
    
}