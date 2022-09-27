export type CreatePartnerRequest = {
  name: string;
  allowedCryptoCurrencies: string[];

  keepWalletsPrivate?: boolean;
  makeOtherPartnerWalletsVisible?: boolean;
  bypassLoginOtp?: boolean;
  bypassWalletOtp?: boolean;

  takeRate?: number;
  creditCardFeeDiscountPercent?: number;
  nobaFeeDiscountPercent?: number;
  processingFeeDiscountPercent?: number;
  networkFeeDiscountPercent?: number;
  spreadDiscountPercent?: number;
};
