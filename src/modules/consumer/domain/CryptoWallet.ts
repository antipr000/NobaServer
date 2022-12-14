import { CryptoWallet as CryptoWalletModel, WalletStatus } from "@prisma/client";
import { Decimal } from "@prisma/client/runtime";
import Joi from "joi";
import { KeysRequired } from "src/modules/common/domain/Types";

export class CryptoWallet implements CryptoWalletModel {
  id: number;
  address: string;
  name: string | null;
  chainType: string | null;
  isEVMCompatible: boolean | null;
  status: WalletStatus;
  riskScore: Decimal | null;
  consumerID: string;
}

export const cryptoWalletJoiValidationKeys: KeysRequired<CryptoWallet> = {
  id: Joi.number().required(),
  address: Joi.string().required(),
  name: Joi.string().optional().allow(null),
  chainType: Joi.string().optional().allow(null),
  isEVMCompatible: Joi.boolean().optional().allow(null),
  status: Joi.string().valid(Object.keys(WalletStatus)),
  riskScore: Joi.number().optional().allow(null),
  consumerID: Joi.string().required(),
};
