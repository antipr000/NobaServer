import { AggregateRoot } from "../../../core/domain/AggregateRoot";
import { VersioningInfo, versioningInfoJoiSchemaKeys, Entity } from "../../../core/domain/Entity";
import { KeysRequired } from "../../common/domain/Types";
import Joi from "joi";
import { KybStatusInfo } from "./KybStatus";
import { WebhookType } from "./WebhookTypes";
import { Utils } from "../../../core/utils/Utils";
import { NotificationConfiguration } from "./NotificationConfiguration";
import {
  NotificationEventHandler,
  NotificationEventType,
} from "../../../modules/notifications/domain/NotificationTypes";

export interface PartnerProps extends VersioningInfo {
  _id: string;
  name: string;
  apiKey: string;
  secretKey: string;
  apiKeyForEmbed: string;
  verificationData?: KybStatusInfo;
  webhookClientID?: string;
  webhookSecret?: string;
  webhooks: PartnerWebhook[];
  config: PartnerConfig;
  isApiEnabled: boolean;
  isEmbedEnabled: boolean;
}

export type PartnerWebhook = {
  type: WebhookType;
  url: string;
};

export type PartnerConfig = {
  privateWallets?: boolean; // Are wallets added under this partner exposed to the user when coming in via other partners?
  viewOtherWallets?: boolean; // Are wallets for other partners allowed to be seen when the user comes in via this partner?
  bypassLogonOTP?: boolean;
  bypassWalletOTP?: boolean;
  cryptocurrencyAllowList?: string[];
  fees: PartnerFees;
  notificationConfig: NotificationConfiguration[];
};

export type PartnerFees = {
  takeRate: number;
  creditCardFeeDiscountPercent: number;
  nobaFeeDiscountPercent: number;
  processingFeeDiscountPercent: number;
  networkFeeDiscountPercent: number;
  spreadDiscountPercent: number;
};

const partnerWebhookJoiKeys: KeysRequired<PartnerWebhook> = {
  type: Joi.string()
    .valid(...Object.values(WebhookType))
    .required(),
  url: Joi.string().required(),
};

export const partnerKeys: KeysRequired<PartnerProps> = {
  ...versioningInfoJoiSchemaKeys,
  _id: Joi.string().min(10).required(),
  name: Joi.string().min(2).max(100).required(),
  apiKey: Joi.string().required(),
  apiKeyForEmbed: Joi.string().required(),
  secretKey: Joi.string().required(),
  isApiEnabled: Joi.boolean().required().default(false),
  isEmbedEnabled: Joi.boolean().required().default(true),
  verificationData: Joi.object().optional(),
  webhookClientID: Joi.string().optional(),
  webhookSecret: Joi.string().optional(),
  webhooks: Joi.array().items(partnerWebhookJoiKeys).default([]),
  config: Joi.object().optional(),
};

export const notificationConfigKeys: KeysRequired<NotificationConfiguration> = {
  notificationEventType: Joi.string()
    .required()
    .valid(...Object.values(NotificationEventType)),
  notificationEventHandler: Joi.array()
    .items(Joi.string().valid(...Object.values(NotificationEventHandler)))
    .default([]),
};

export const partnerConfigKeys: KeysRequired<PartnerConfig> = {
  privateWallets: Joi.boolean().optional(),
  viewOtherWallets: Joi.boolean().optional(),
  bypassLogonOTP: Joi.boolean().optional(),
  bypassWalletOTP: Joi.boolean().optional(),
  cryptocurrencyAllowList: Joi.array().items(Joi.string()).default([]),
  fees: Joi.object().optional(),
  notificationConfig: Joi.array().items(notificationConfigKeys).default([]),
};

export const partnerFees: KeysRequired<PartnerFees> = {
  takeRate: Joi.number().optional(),
  creditCardFeeDiscountPercent: Joi.number().optional(),
  nobaFeeDiscountPercent: Joi.number().optional(),
  processingFeeDiscountPercent: Joi.number().optional(),
  networkFeeDiscountPercent: Joi.number().optional(),
  spreadDiscountPercent: Joi.number().optional(),
};

export const partnerSchema = Joi.object(partnerKeys).options({ allowUnknown: true, stripUnknown: false });

export class Partner extends AggregateRoot<PartnerProps> {
  private constructor(partnerProps: PartnerProps) {
    super(partnerProps);
  }

  public static createPartner(partnerProps: Partial<PartnerProps>): Partner {
    if (!partnerProps._id) partnerProps._id = Entity.getNewID();
    if (!partnerProps.apiKey) partnerProps.apiKey = Partner.generateAPIKey();
    if (!partnerProps.apiKeyForEmbed) partnerProps.apiKeyForEmbed = Partner.generateAPIKey();
    if (!partnerProps.secretKey) partnerProps.secretKey = Partner.generateSecretKey();
    if (!partnerProps.webhookClientID) partnerProps.webhookClientID = Partner.generateAPIKey();
    if (!partnerProps.webhookSecret) partnerProps.webhookSecret = Partner.generateSecretKey();

    if (!partnerProps.webhooks) partnerProps.webhooks = [];
    if (!partnerProps.config) partnerProps.config = {} as any;

    if (!partnerProps.isApiEnabled) partnerProps.isApiEnabled = false;

    if (!partnerProps.isEmbedEnabled) partnerProps.isEmbedEnabled = true;

    if (!partnerProps.config.notificationConfig) partnerProps.config.notificationConfig = [];

    partnerProps.config.fees = {
      creditCardFeeDiscountPercent: 0,
      networkFeeDiscountPercent: 0,
      nobaFeeDiscountPercent: 0,
      processingFeeDiscountPercent: 0,
      spreadDiscountPercent: 0,
      takeRate: 1, // TODO(#): Define a proper default 'takeRate'.

      ...(partnerProps.config.fees ? partnerProps.config.fees : {}),
    };

    return new Partner(Joi.attempt(partnerProps, partnerSchema));
  }

  public static generateAPIKey(): string {
    return Utils.generateLowercaseUUID(true);
  }

  public static generateSecretKey(): string {
    return Utils.generateBase64String(64);
  }
}
