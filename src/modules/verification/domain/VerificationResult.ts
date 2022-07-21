import {
  KYCStatus,
  DocumentVerificationStatus,
  WalletStatus,
  PaymentMethodStatus,
  RiskLevel,
} from "../../consumer/domain/VerificationStatus";

export type ConsumerVerificationResult = {
  status: KYCStatus;
  sanctionLevel?: RiskLevel;
  pepLevel?: RiskLevel;
  walletStatus?: WalletStatus;
  paymentMethodStatus?: PaymentMethodStatus;
};

export type DocumentVerificationResult = {
  status: DocumentVerificationStatus;
  riskRating?: string;
};
