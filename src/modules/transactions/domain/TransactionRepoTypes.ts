export type UpdateFiatTransactionInfoRequest = {
  transactionID: string;

  willUpdateIsApproved: boolean;
  updatedIsApprovedValue?: boolean;

  willUpdateIsFailed: boolean;
  updatedIsFailedValue?: boolean;

  willUpdateIsCompleted: boolean;
  updatedIsCompletedValue?: boolean;

  details: string;
};

export type PartnerTransactionFilterOptions = {
  startDate?: Date;
  endDate?: Date;
  partnerID?: string;
  includeIncompleteTransactions: boolean;
};

export type PartnerTransaction = {
  partnerID: string;
  transactionID: string;
  userID: string;
  transactionCreationDate: string;
  status: string;
  fiatAmount: number;
  fiatCurrency: string;
  cryptoQuantity: number;
  cryptoCurrency: string;
  processingFeeCharged: number;
  networkFeeCharged: number;
  nobaFeeCharged: number;
  fixedCreditCardFeeWaived: number;
  dynamicCreditCardFeeWaived: number;
  nobaFeeWaived: number;
  networkFeeWaived: number;
  spreadAmountWaived: number;
};
