import { CryptoWallet as CryptoWalletModel, WalletStatus } from "@prisma/client";
import Joi from "joi";
import { AggregateRoot } from "../../../core/domain/AggregateRoot";
import { basePropsJoiSchemaKeys } from "../../../core/domain/Entity";
import { KeysRequired } from "../../../modules/common/domain/Types";

export class CryptoWalletProps implements Partial<CryptoWalletModel> {
  id: string;
  address: string;
  name?: string | null;
  chainType?: string | null;
  isEVMCompatible?: boolean | null;
  status: WalletStatus;
  riskScore?: number | null;
  consumerID: string;
  createdTimestamp?: Date | null;
  updatedTimestamp?: Date | null;
}

export const cryptoWalletJoiValidationKeys: KeysRequired<CryptoWalletProps> = {
  ...basePropsJoiSchemaKeys,
  id: Joi.string().required(),
  address: Joi.string().required(),
  name: Joi.string().optional().allow(null),
  chainType: Joi.string().optional().allow(null),
  isEVMCompatible: Joi.boolean().optional().allow(null),
  status: Joi.string().required(),
  riskScore: Joi.number().optional().allow(null),
  consumerID: Joi.string().required(),
};

export const cryptoWalletJoiSchema = Joi.object(cryptoWalletJoiValidationKeys).options({
  allowUnknown: true,
  stripUnknown: false,
});

export class CryptoWallet extends AggregateRoot<CryptoWalletProps> {
  constructor(cryptoWalletProps: CryptoWalletProps) {
    super(cryptoWalletProps);
  }

  public static createCryptoWallet(cryptoWalletProps: Partial<CryptoWalletProps>): CryptoWallet {
    if (!cryptoWalletProps.id) cryptoWalletProps.id = this.getNewID();
    if (!cryptoWalletProps.status) cryptoWalletProps.status = WalletStatus.PENDING;
    return new CryptoWallet(Joi.attempt(cryptoWalletProps, cryptoWalletJoiSchema));
  }
}
