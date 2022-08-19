import { ConsumerProps } from "../../consumer/domain/Consumer";

export interface FundsAvailabilityRequest {
  fiatAmount: number;
  fiatCurrency: string;

  cryptoQuantity: number;
  cryptoCurrency: string;

  slippage: number;

  transactionId: string;
  transactionCreationTimestamp: Date;

  consumer: ConsumerProps;
}

export interface ConsumerAccountTransferRequest {
  consumer: ConsumerProps;
  tradePrice: number;
  quantity: number;

  transactionId: string;
  transactionCreationTimestamp: Date;
}

export interface ConsumerWalletTransferRequest {
  walletAddress: string;
  amount: number;
  consumer: ConsumerProps;
  transactionId: string;
}