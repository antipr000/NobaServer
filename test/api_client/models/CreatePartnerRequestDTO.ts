/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */

export type CreatePartnerRequestDTO = {
  name: string;
  allowedCryptoCurrencies: Array<string>;
  keepWalletsPrivate?: boolean;
  makeOtherPartnerWalletsVisible?: boolean;
  bypassWalletOtp?: boolean;
  creditCardFeeDiscountPercent?: number;
  nobaFeeDiscountPercent?: number;
  processingFeeDiscountPercent?: number;
  networkFeeDiscountPercent?: number;
  spreadDiscountPercent?: number;
};
