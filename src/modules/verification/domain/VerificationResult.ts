import {
  KYCStatus,
  DocumentVerificationStatus,
  WalletStatus,
  PaymentMethodStatus,
} from "../../consumer/domain/VerificationStatus";

export type ConsumerVerificationResult = {
  status: KYCStatus;
  walletStatus?: WalletStatus;
  paymentMethodStatus?: PaymentMethodStatus;
};

export type DocumentVerificationResult = {
  status: DocumentVerificationStatus;
  riskRating?: string;
};
