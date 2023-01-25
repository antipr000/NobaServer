import { WithdrawalDetails as PrismaWithdrawalDetailsModel } from "@prisma/client";
import Joi from "joi";
import { KeysRequired } from "../../../modules/common/domain/Types";

export enum AccountType {
  SAVINGS = "Savings",
  CURRENT = "Current",
  ELECTRONIC_DEPOSIT = "ElectronicDeposit",
}

export enum DocumentType {
  CC = "CC",
  TI = "TI",
  NUIP = "NUIP",
  CE = "CE",
  NIT = "NIT",
  PASS = "PASS",
}

export class WithdrawalDetails {
  id: string;
  bankCode: string;
  accountNumber: string;
  accountType: AccountType;
  documentNumber: string;
  documentType: DocumentType;
  transactionID: string;
}

export class InputWithdrawalDetails {
  bankCode: string;
  accountNumber: string;
  accountType: AccountType;
  documentNumber: string;
  documentType: DocumentType;
  transactionID: string;
}

export const validateInputWithdrawalDetails = (withdrawalDetails: InputWithdrawalDetails) => {
  const withdrawalDetailsJoiValidationKeys: KeysRequired<InputWithdrawalDetails> = {
    bankCode: Joi.string().required(),
    accountNumber: Joi.string().required(),
    accountType: Joi.string()
      .valid(...Object.values(AccountType))
      .required(),
    documentNumber: Joi.string().required(),
    documentType: Joi.string()
      .valid(...Object.values(DocumentType))
      .required(),
    transactionID: Joi.string().required(),
  };

  const withdrawalDetailsJoiSchema = Joi.object(withdrawalDetailsJoiValidationKeys).options({
    allowUnknown: false,
    stripUnknown: true,
  });
  Joi.attempt(withdrawalDetails, withdrawalDetailsJoiSchema);
};

export const validateSavedWithdrawalDetails = (withdrawalDetails: WithdrawalDetails) => {
  const withdrawalDetailsJoiValidationKeys: KeysRequired<WithdrawalDetails> = {
    id: Joi.string().required(),
    bankCode: Joi.string().required(),
    accountNumber: Joi.string().required(),
    accountType: Joi.string()
      .valid(...Object.values(AccountType))
      .required(),
    documentNumber: Joi.string().required(),
    documentType: Joi.string()
      .valid(...Object.values(DocumentType))
      .required(),
    transactionID: Joi.string().required(),
  };

  const withdrawalDetailsJoiSchema = Joi.object(withdrawalDetailsJoiValidationKeys).options({
    allowUnknown: false,
    stripUnknown: true,
  });
  Joi.attempt(withdrawalDetails, withdrawalDetailsJoiSchema);
};

export const convertToDomainWithdrawalDetails = (
  withdrawalDetails: PrismaWithdrawalDetailsModel,
): WithdrawalDetails => {
  return {
    id: withdrawalDetails.id,
    bankCode: withdrawalDetails.bankCode,
    accountNumber: withdrawalDetails.accountNumber,
    accountType: withdrawalDetails.accountType as AccountType,
    documentNumber: withdrawalDetails.documentNumber,
    documentType: withdrawalDetails.documentType as DocumentType,
    transactionID: withdrawalDetails.transactionID,
  };
};
