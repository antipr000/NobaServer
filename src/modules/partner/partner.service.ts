import { BadRequestException, Inject, Injectable } from "@nestjs/common";
import { PartnerProps, Partner, PartnerWebhook } from "./domain/Partner";
import { WINSTON_MODULE_PROVIDER } from "nest-winston";
import { Logger } from "winston";
import { IPartnerRepo } from "./repo/PartnerRepo";
import { WebhookType } from "./domain/WebhookTypes";

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

  async getPartnerFromApiKey(apiKey: string): Promise<Partner> {
    const partner: Partner = await this.partnerRepo.getPartnerFromApiKey(apiKey);
    return partner;
  }

  async createPartner(partnerName: string): Promise<Partner> {
    const partner = Partner.createPartner({ name: partnerName });
    const partnerResult: Partner = await this.partnerRepo.addPartner(partner);
    return partnerResult;
  }

  async updatePartner(partnerId: string, partialPartnerProps: Partial<PartnerProps>): Promise<Partner> {
    const partner = await this.getPartner(partnerId);
    const updatedPatner = Partner.createPartner({
      ...partner.props,
      ...partialPartnerProps,
    });
    console.log(`Updated partner: ${JSON.stringify(updatedPatner)}`);
    const partnerResult: Partner = await this.partnerRepo.updatePartner(updatedPatner);
    return partnerResult;
  }

  getWebhook(partner: Partner, type: WebhookType): PartnerWebhook {
    let webhookArray = partner.props.webhooks.filter(webhook => webhook.type === type);
    if (webhookArray.length == 0) {
      return null;
    }

    return webhookArray[0];
  }

  async addOrReplaceWebhook(partnerID: string, type: WebhookType, url: string): Promise<Partner> {
    const partner = await this.getPartner(partnerID);
    if (!partner) {
      throw new BadRequestException("Unknown partner ID");
    }

    const partnerUpdates: Partial<PartnerProps> = {};
    if (!partner.props.webhookClientID) {
      // Generate a new client id using API key algorithm
      partnerUpdates.webhookClientID = Partner.generateAPIKey();
    }

    if (!partner.props.webhookSecret) {
      // Generate new secret
      partnerUpdates.webhookSecret = Partner.generateSecretKey();
    }

    // Get all the webhooks except for any existing of the same type that we want to overwrite
    let existingWebhooks = partner.props.webhooks.filter(webhook => webhook.type !== type);
    if (!existingWebhooks) {
      existingWebhooks = [];
    }

    existingWebhooks.push({ type: type, url: url });
    partnerUpdates.webhooks = existingWebhooks;

    const partnerResult: Partner = await this.updatePartner(partnerID, partnerUpdates);
    return partnerResult;
  }
}
