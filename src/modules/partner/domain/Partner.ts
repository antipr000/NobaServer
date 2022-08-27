import { AggregateRoot } from "../../../core/domain/AggregateRoot";
import { VersioningInfo, versioningInfoJoiSchemaKeys, Entity } from "../../../core/domain/Entity";
import { KeysRequired } from "../../common/domain/Types";
import * as Joi from "joi";
import { KybStatusInfo } from "./KybStatus";
import { randomBytes, randomUUID } from "crypto"; // built-in node crypto, not from npm
import { WebhookType } from "./WebhookTypes";

export interface PartnerProps extends VersioningInfo {
  _id: string;
  name: string;
  apiKey: string;
  secretKey: string;
  verificationData?: KybStatusInfo;
  takeRate?: number;
  allowPublicWallets?: boolean; // Can wallets added for this partner be shared with others?
  webhookClientID?: string;
  webhookSecret?: string;
  webhooks?: PartnerWebhook[];
}

export type PartnerWebhook = {
  type: WebhookType;
  url: string;
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
  secretKey: Joi.string().required(),
  verificationData: Joi.object().optional(),
  takeRate: Joi.number().optional(),
  allowPublicWallets: Joi.boolean().default(true),
  webhookClientID: Joi.string().optional(),
  webhookSecret: Joi.string().optional(),
  webhooks: Joi.array().items(partnerWebhookJoiKeys).default([]),
};

export const partnerSchema = Joi.object(partnerKeys).options({ allowUnknown: true, stripUnknown: false });

export class Partner extends AggregateRoot<PartnerProps> {
  private constructor(partnerProps: PartnerProps) {
    super(partnerProps);
  }

  public static createPartner(partnerProps: Partial<PartnerProps>): Partner {
    if (!partnerProps._id) partnerProps._id = Entity.getNewID();
    if (!partnerProps.apiKey) partnerProps.apiKey = Partner.generateAPIKey();
    if (!partnerProps.secretKey) partnerProps.secretKey = Partner.generateSecretKey();
    return new Partner(Joi.attempt(partnerProps, partnerSchema));
  }

  public static generateAPIKey(): string {
    // 1. Generate UUID
    // 2. Convert to lowercase
    // 3. Remove all hyphens
    return randomUUID().toLowerCase().replace(/-/g, "");
  }

  public static generateSecretKey(): string {
    // Base64-encoded 64 random bytes
    return randomBytes(64).toString("base64");
  }
}
