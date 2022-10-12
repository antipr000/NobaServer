import { BadRequestException, Inject, Injectable } from "@nestjs/common";
import { Partner, PartnerWebhook } from "./domain/Partner";
import { WINSTON_MODULE_PROVIDER } from "nest-winston";
import { Logger } from "winston";
import { IPartnerRepo } from "./repo/PartnerRepo";
import { WebhookType } from "./domain/WebhookTypes";
import { CreatePartnerRequest } from "./dto/ServiceTypes";
import { UpdatePartnerRequestDTO } from "./dto/UpdatePartnerRequestDTO";
import { TransactionFilterOptions } from "../transactions/domain/Types";
import { PaginatedResult } from "../../core/infra/PaginationTypes";
import { TransactionDTO } from "../transactions/dto/TransactionDTO";
import { ITransactionRepo } from "../transactions/repo/TransactionRepo";
import { TransactionMapper } from "../transactions/mapper/TransactionMapper";

@Injectable()
export class PartnerService {
  @Inject(WINSTON_MODULE_PROVIDER)
  private readonly logger: Logger;

  @Inject("PartnerRepo")
  private readonly partnerRepo: IPartnerRepo;

  @Inject("TransactionRepo")
  private readonly transactionRepo: ITransactionRepo;

  private readonly transactionMapper: TransactionMapper;

  constructor() {
    this.transactionMapper = new TransactionMapper();
  }

  async getPartner(partnerId: string): Promise<Partner> {
    const partner: Partner = await this.partnerRepo.getPartner(partnerId);
    return partner;
  }

  async getPartnerFromApiKey(apiKey: string): Promise<Partner> {
    const partner: Partner = await this.partnerRepo.getPartnerFromApiKey(apiKey);
    return partner;
  }

  async createPartner(request: CreatePartnerRequest): Promise<Partner> {
    const requiredFields = ["name"];
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
        notificationConfig: [],
      },
    });
    const partnerResult: Partner = await this.partnerRepo.addPartner(partner);
    return partnerResult;
  }

  async updatePartner(partnerId: string, partnerUpdateRequest: UpdatePartnerRequestDTO): Promise<Partner> {
    const partner = await this.getPartner(partnerId);
    const updatedPartner = Partner.createPartner({
      ...partner.props,
      name: partnerUpdateRequest.name ?? partner.props.name,
      config: {
        ...partner.props.config,
        fees: {
          ...partner.props.config.fees,
          takeRate: partnerUpdateRequest.takeRate ?? partner.props.config.fees.takeRate,
        },
        notificationConfig: partnerUpdateRequest.notificationConfigs ?? partner.props.config.notificationConfig,
      },
      webhooks: partnerUpdateRequest.webhooks ?? partner.props.webhooks,
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

    // Get all the webhooks except for any existing of the same type that we want to overwrite
    const existingWebhooks = partner.props.webhooks.filter(webhook => webhook.type !== type);

    existingWebhooks.push({ type: type, url: url });

    const partnerResult: Partner = await this.updatePartner(partnerID, { webhooks: existingWebhooks });
    return partnerResult;
  }

  async getAllTransactionsForPartner(
    partnerID: string,
    transactionQuery?: TransactionFilterOptions,
  ): Promise<PaginatedResult<TransactionDTO>> {
    const transactionsResult = await this.transactionRepo.getPartnerTransactions(partnerID, transactionQuery);
    return { ...transactionsResult, items: transactionsResult.items.map(this.transactionMapper.toDTO) };
  }

  async getTransaction(transactionID: string): Promise<TransactionDTO> {
    const transaction = await this.transactionRepo.getTransaction(transactionID);
    return this.transactionMapper.toDTO(transaction);
  }
}
