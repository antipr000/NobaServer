import { AggregateRoot } from "../../../core/domain/AggregateRoot";
import { Entity, basePropsJoiSchemaKeys } from "../../../core/domain/Entity";
import { KeysRequired } from "./Types";
import Joi from "joi";
import { BINValidity, CardType, CreditCardDTO } from "../dto/CreditCardDTO";
import { creditCardMaskGenerator } from "../../../core/utils/CreditCardMaskGenerator";
import { CreditCardBIN } from "@prisma/client";
import { Utils } from "../../../core/utils/Utils";

export class CreditCardBinDataProps implements Partial<CreditCardBIN> {
  id: string;
  issuer?: string | null;
  bin: string;
  type: string;
  network: string;
  mask?: string | null;
  supported: string;
  digits: number;
  cvvDigits: number;
  createdTimestamp: Date;
  updatedTimestamp: Date;
}

export const creditCardBinDataKeys: KeysRequired<CreditCardBinDataProps> = {
  ...basePropsJoiSchemaKeys,
  id: Joi.string().required(),
  issuer: Joi.string().optional().allow("", null),
  bin: Joi.string().required(),
  type: Joi.string()
    .valid(...Object.values(CardType))
    .default(CardType.CREDIT),
  network: Joi.string().required(),
  mask: Joi.string().optional().allow("", null),
  supported: Joi.string()
    .valid(...Object.values(BINValidity))
    .default(BINValidity.NOT_SUPPORTED),
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
    if (!creditCardBinDataProps.id) creditCardBinDataProps.id = Entity.getNewID();
    if (!creditCardBinDataProps.mask)
      creditCardBinDataProps.mask = creditCardMaskGenerator(creditCardBinDataProps.bin, creditCardBinDataProps.digits);
    return new CreditCardBinData(Joi.attempt(creditCardBinDataProps, creditCardBinDataJoiSchema));
  }

  public toDTO(): CreditCardDTO {
    return {
      issuer: this.props.issuer,
      bin: this.props.bin,
      type: Utils.enumFromValue(this.props.type, CardType),
      network: this.props.network,
      mask: this.props.mask,
      supported: Utils.enumFromValue(this.props.supported, BINValidity),
      digits: this.props.digits,
      cvvDigits: this.props.cvvDigits,
    };
  }
}
