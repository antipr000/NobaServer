import { AggregateRoot } from "../../../core/domain/AggregateRoot";
import { VersioningInfo, versioningInfoJoiSchemaKeys, Entity } from "../../../core/domain/Entity";
import { KeysRequired } from "../../common/domain/Types";
import * as Joi from "joi";
import { KybStatusInfo } from "./KybStatus";

export interface PartnerProps extends VersioningInfo {
  _id: string;
  name: string;
  apiKey: string;
  secretKey: string;
  verificationData?: KybStatusInfo;
  takeRate?: number;
}

export const partnerKeys: KeysRequired<PartnerProps> = {
  ...versioningInfoJoiSchemaKeys,
  _id: Joi.string().min(10).required(),
  name: Joi.string().min(2).max(100).required(),
  apiKey: Joi.string().required(),
  secretKey: Joi.string().required(),
  verificationData: Joi.object().optional(),
  takeRate: Joi.number().optional(),
};

export const partnerSchema = Joi.object(partnerKeys).options({ allowUnknown: true, stripUnknown: false });

export class Partner extends AggregateRoot<PartnerProps> {
  private constructor(partnerProps: PartnerProps) {
    super(partnerProps);
  }

  public static createPartner(partnerProps: Partial<PartnerProps>): Partner {
    if (!partnerProps._id) partnerProps._id = Entity.getNewID();
    if (!partnerProps.apiKey) partnerProps.apiKey = "Noba-Partner-" + Entity.getNewID();
    if (!partnerProps.secretKey) partnerProps.secretKey = `Noba_Secret_${new Date().valueOf()}_${Entity.getNewID()}`;
    return new Partner(Joi.attempt(partnerProps, partnerSchema));
  }
}
