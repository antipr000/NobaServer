import {
    Inject,
    Injectable,
  } from "@nestjs/common";
import { PartnerProps, Partner } from "./domain/Partner";
import { WINSTON_MODULE_PROVIDER } from "nest-winston";
import { Logger } from "winston";
import { IPartnerRepo } from "./repo/PartnerRepo";
  
  @Injectable()
  export class PartnerService {
    @Inject(WINSTON_MODULE_PROVIDER)
    private readonly logger: Logger;
    
  
    constructor(
      private readonly partnerRepo: IPartnerRepo) {
    }
  
    async getPartner(partnerId: string): Promise<PartnerProps> {
        const partner: Partner = await this.partnerRepo.getPartner(partnerId);
        return partner.props;
    }

    async createPartner(partnerName: string): Promise<PartnerProps> {
        const partner = Partner.createPartner({ name: partnerName });
        const partnerResult: Partner = await this.partnerRepo.addPartner(partner);
        return partnerResult.props;
    }

    async updateTakeRate(partnerId: string, takeRate: number): Promise<PartnerProps> {
        const partner: Partner = await this.partnerRepo.updateTakeRate(partnerId, takeRate);
        return partner.props;
    }

    async updatePartner(partnerId: string, partialPartnerProps: Partial<PartnerProps>): Promise<PartnerProps> {
        const partnerProps = await this.getPartner(partnerId);
        const updatedPatner = Partner.createPartner({
            ...partnerProps,
            ...partialPartnerProps
        });
        const partnerResult: Partner = await this.partnerRepo.updatePartner(updatedPatner);
        return partnerResult.props;
    } 
  }
  