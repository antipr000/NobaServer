import { CryptoWallet as CryptoWalletModel, WalletStatus } from "@prisma/client";
import { Decimal } from "@prisma/client/runtime";
import Joi from "joi";
import { basePropsJoiSchemaKeys } from "../../../core/domain/Entity";
import { KeysRequired } from "../../../modules/common/domain/Types";

export class CryptoWallet implements CryptoWalletModel {
  id: string;
  address: string;
  name: string | null;
  chainType: string | null;
  isEVMCompatible: boolean | null;
  status: WalletStatus;
  riskScore: Decimal | null;
  consumerID: string;
  createdTimestamp: Date | null;
  updatedTimestamp: Date | null;
}

export const cryptoWalletJoiValidationKeys: KeysRequired<CryptoWallet> = {
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
