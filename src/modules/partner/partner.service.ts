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
import { PartnerLogoUploadRequestDTO } from "./dto/PartnerLogoUploadRequestDTO";
import { S3 } from "aws-sdk";
import { BadRequestError } from "../../core/exception/CommonAppException";
import sharp from "sharp";
import { getEnvironmentName, PARTNER_CONFIG_KEY } from "../../config/ConfigurationUtils";
import { Entity } from "../../core/domain/Entity";
import { CustomConfigService } from "../../core/utils/AppConfigModule";
import { PartnerConfigs } from "../../config/configtypes/PartnerConfigs";

@Injectable()
export class PartnerService {
  @Inject(WINSTON_MODULE_PROVIDER)
  private readonly logger: Logger;

  @Inject("PartnerRepo")
  private readonly partnerRepo: IPartnerRepo;

  @Inject("TransactionRepo")
  private readonly transactionRepo: ITransactionRepo;

  private readonly transactionMapper: TransactionMapper;

  readonly partnerDataS3Bucket;
  readonly cloudfrontUrl;
  readonly s3BucketUrl;

  constructor(private readonly configService: CustomConfigService) {
    this.transactionMapper = new TransactionMapper();
    const partnerConfig: PartnerConfigs = this.configService.get<PartnerConfigs>(PARTNER_CONFIG_KEY);
    this.partnerDataS3Bucket = partnerConfig.publicS3Bucket;
    this.cloudfrontUrl = partnerConfig.publicDataCloudfrontUrl;
    this.s3BucketUrl = `https://${this.partnerDataS3Bucket}.s3.amazonaws.com/`;
  }

  async getPartner(partnerID: string): Promise<Partner> {
    const partner: Partner = await this.partnerRepo.getPartner(partnerID);
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

  async updatePartner(partnerID: string, partnerUpdateRequest: UpdatePartnerRequestDTO): Promise<Partner> {
    const partner = await this.getPartner(partnerID);
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
    transactionQuery.partnerID = partnerID;
    const transactionsResult = await this.transactionRepo.getFilteredTransactions(transactionQuery);
    return { ...transactionsResult, items: transactionsResult.items.map(this.transactionMapper.toDTO) };
  }

  async getTransaction(transactionID: string): Promise<TransactionDTO> {
    const transaction = await this.transactionRepo.getTransaction(transactionID);
    return this.transactionMapper.toDTO(transaction);
  }

  async uploadPartnerLogo(partnerID: string, partnerLogoRequest: PartnerLogoUploadRequestDTO): Promise<Partner> {
    const partner = await this.getPartner(partnerID);
    let newSmallLogoLink: string;
    let newLogoLink: string;

    if (!partnerLogoRequest.logo && !partnerLogoRequest.logoSmall) {
      throw new BadRequestException("No logo or small logo provided");
    }

    if (partnerLogoRequest.logo) {
      newLogoLink = await this.transformAndUploadLogoToS3(partner, partnerLogoRequest.logo[0], 800, 200, "logo");
    }
    if (partnerLogoRequest.logoSmall) {
      newSmallLogoLink = await this.transformAndUploadLogoToS3(
        partner,
        partnerLogoRequest.logoSmall[0],
        200,
        200,
        "logo_small",
      );
    }

    const updatedPartner = Partner.createPartner({
      ...partner.props,
      config: {
        ...partner.props.config,
        logo: newLogoLink ?? partner.props.config.logo,
        logoSmall: newSmallLogoLink ?? partner.props.config.logoSmall,
      },
    });

    return await this.partnerRepo.updatePartner(updatedPartner);
  }

  private async transformAndUploadLogoToS3(
    partner: Partner,
    file: Express.Multer.File,
    width: number,
    height: number,
    filename: string,
  ): Promise<string> {
    const transformedFile = await this.transformLogo(file, width, height);
    const s3Data: any = await this.uploadLogo(partner, transformedFile, filename);
    return s3Data.Location.replace(this.s3BucketUrl, this.cloudfrontUrl); // cloudfront distro images are public
  }

  private async transformLogo(file: Express.Multer.File, width: number, height: number) {
    const isJpgOrPng = file.mimetype === "image/jpeg" || file.mimetype === "image/png";
    if (!isJpgOrPng) {
      throw new BadRequestError({ messageForClient: "logo file needs to be jpeg or png" });
    }

    const buffer = file.buffer;

    const compressedImage = await sharp(buffer).resize(width, height, { fit: sharp.fit.inside }).toBuffer();

    file.buffer = compressedImage;

    return file;
  }

  private async uploadLogo(partner: Partner, file: Express.Multer.File, filename: string) {
    const s3BucketName = this.partnerDataS3Bucket;
    const fileFormat = file.mimetype.split("/")[1];
    const s3Params: S3.Types.PutObjectRequest = {
      Bucket: s3BucketName,
      Key: `${getEnvironmentName()}/${partner.props.name.toLowerCase().split(" ").join("-")}_${
        partner.props._id
      }/${filename}_${Entity.getNewID()}.${fileFormat}`,
      Body: file.buffer,
      ContentType: file.mimetype,
    };

    const s3 = new S3();
    return await s3.upload(s3Params).promise();
  }
}
