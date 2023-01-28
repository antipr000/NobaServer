/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */

export type WithdrawalDTO = {
  bankCode: string;
  accountNumber: string;
  accountType: "savings_account" | "checking_account" | "electronic_deposit";
  documentNumber: string;
  documentType: "CC" | "TI" | "NUIP" | "CE" | "NIT" | "PASS";
};
