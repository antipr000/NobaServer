import { AggregateRoot } from "../../../core/domain/AggregateRoot";
import { Entity, VersioningInfo, versioningInfoJoiSchemaKeys } from "../../../core/domain/Entity";
import { KeysRequired } from "./Types";
import Joi from "joi";
import { BINValidity, CardType } from "../dto/CreditCardDTO";

export interface CreditCardBinDataProps extends VersioningInfo {
  _id: string;
  issuer: string;
  bin: string;
  type: CardType;
  network: string;
  mask?: string;
  supported: BINValidity;
  digits: number;
  cvvDigits: number;
}

export const creditCardBinDataKeys: KeysRequired<CreditCardBinDataProps> = {
  ...versioningInfoJoiSchemaKeys,
  _id: Joi.string().required(),
  issuer: Joi.string().required(),
  bin: Joi.string()
    .required()
    .meta({ _mongoose: { index: true, unique: true } }),
  type: Joi.string().default(CardType.CREDIT),
  network: Joi.string().required(),
  mask: Joi.string().optional(),
  supported: Joi.string().default(BINValidity.NOT_SUPPORTED),
  digits: Joi.number().default(16),
  cvvDigits: Joi.number().default(3),
};

export const creditCardBinDataJoiSchema = Joi.object(creditCardBinDataKeys).options({ allowUnknown: true });

export class CreditCardBinData extends AggregateRoot<CreditCardBinDataProps> {
  private constructor(creditCardBinDataProps: CreditCardBinDataProps) {
    super(creditCardBinDataProps);
  }

  public static createCreditCardBinDataObject(
    creditCardBinDataProps: Partial<CreditCardBinDataProps>,
  ): CreditCardBinData {
    if (!creditCardBinDataProps._id) creditCardBinDataProps._id = Entity.getNewID();
    return new CreditCardBinData(Joi.attempt(creditCardBinDataProps, creditCardBinDataJoiSchema));
  }
}
