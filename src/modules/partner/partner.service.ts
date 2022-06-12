import { Inject, Injectable } from "@nestjs/common";
import { PartnerProps, Partner } from "./domain/Partner";
import { WINSTON_MODULE_PROVIDER } from "nest-winston";
import { Logger } from "winston";
import { IPartnerRepo } from "./repo/PartnerRepo";

@Injectable()
export class PartnerService {
  @Inject(WINSTON_MODULE_PROVIDER)
  private readonly logger: Logger;

  @Inject("PartnerRepo")
  private readonly partnerRepo: IPartnerRepo;

  // eslint-disable-next-line @typescript-eslint/no-empty-function
  constructor() {}

  async getPartner(partnerId: string): Promise<Partner> {
    const partner: Partner = await this.partnerRepo.getPartner(partnerId);
    return partner;
  }

  async createPartner(partnerName: string): Promise<Partner> {
    const partner = Partner.createPartner({ name: partnerName });
    const partnerResult: Partner = await this.partnerRepo.addPartner(partner);
    return partnerResult;
  }

  async updateTakeRate(partnerId: string, takeRate: number): Promise<Partner> {
    const partner: Partner = await this.partnerRepo.updateTakeRate(partnerId, takeRate);
    return partner;
  }

  async updatePartner(partnerId: string, partialPartnerProps: Partial<PartnerProps>): Promise<Partner> {
    const partner = await this.getPartner(partnerId);
    const updatedPatner = Partner.createPartner({
      ...partner.props,
      ...partialPartnerProps,
    });
    const partnerResult: Partner = await this.partnerRepo.updatePartner(updatedPatner);
    return partnerResult;
  }
}
