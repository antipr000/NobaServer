import { BadRequestException, Inject, Injectable } from "@nestjs/common";
import { PartnerProps, Partner, PartnerWebhook } from "./domain/Partner";
import { WINSTON_MODULE_PROVIDER } from "nest-winston";
import { Logger } from "winston";
import { IPartnerRepo } from "./repo/PartnerRepo";
import { WebhookType } from "./domain/WebhookTypes";
import { CreatePartnerRequest } from "./dto/ServiceTypes";

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

  async createPartner(request: CreatePartnerRequest): Promise<Partner> {
    const requiredFields = ["name", "allowedCryptoCurrencies", "takeRate"];
    requiredFields.forEach(field => {
      if (!request[field])
        throw new BadRequestException(`"${requiredFields}" fields are required for creating a Partner`);
    });

    const partner = Partner.createPartner({
      name: request.name,
      config: {
        viewOtherWallets: request.makeOtherPartnerWalletsVisible ?? true,
        privateWallets: request.keepWalletsPrivate ?? false,
        bypassLogonOTP: request.bypassLoginOtp ?? false,
        bypassWalletOTP: request.bypassWalletOtp ?? false,
        cryptocurrencyAllowList: request.allowedCryptoCurrencies,
        fees: {
          creditCardFeeDiscountPercent: request.creditCardFeeDiscountPercent ?? 0,
          networkFeeDiscountPercent: request.networkFeeDiscountPercent ?? 0,
          nobaFeeDiscountPercent: request.nobaFeeDiscountPercent ?? 0,
          processingFeeDiscountPercent: request.processingFeeDiscountPercent ?? 0,
          spreadDiscountPercent: request.spreadDiscountPercent ?? 0,
          takeRate: request.takeRate,
        },
      },
    });
    const partnerResult: Partner = await this.partnerRepo.addPartner(partner);
    return partnerResult;
  }

  async updatePartner(partnerId: string, partialPartnerProps: Partial<PartnerProps>): Promise<Partner> {
    const partner = await this.getPartner(partnerId);
    const updatedPartner = Partner.createPartner({
      ...partner.props,
      ...partialPartnerProps,
    });

    const partnerResult: Partner = await this.partnerRepo.updatePartner(updatedPartner);
    return partnerResult;
  }

  getWebhook(partner: Partner, type: WebhookType): PartnerWebhook {
    const webhookArray = partner.props.webhooks.filter(webhook => webhook.type === type);
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
