import { DBProvider } from "../../../infraproviders/DBProvider";
import { Partner } from "../domain/Partner";
import { Injectable } from "@nestjs/common";
import { IPartnerRepo } from "./PartnerRepo";
 


//TODO figure out a way to create indices using joi schema and joigoose
@Injectable()
export class MongoDBPartnerRepo implements IPartnerRepo {

    constructor(private readonly dbProvider: DBProvider) {

    }

    getPartner(partnerId: string): Promise<Partner> {
        throw new Error("Method not implemented.");
    }
    addPartner(partner: Partner): Promise<Partner> {
        throw new Error("Method not implemented.");
    }
    updateTakeRate(partnerId: string, takeRate: number): Promise<Partner> {
        throw new Error("Method not implemented.");
    }
    updatePartner(partner: Partner): Promise<Partner> {
        throw new Error("Method not implemented.");
    }
    
}