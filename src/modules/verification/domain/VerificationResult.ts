import { RiskLevel } from "../../consumer/domain/VerificationStatus";
import { KYCStatus, WalletStatus, PaymentMethodStatus, DocumentVerificationStatus } from "@prisma/client";

export type ConsumerVerificationResult = {
  status: KYCStatus;
  sanctionLevel?: RiskLevel;
  pepLevel?: RiskLevel;
  walletStatus?: WalletStatus;
  paymentMethodStatus?: PaymentMethodStatus;
  idvProviderRiskLevel?: string;
};

export type DocumentVerificationResult = {
  status: DocumentVerificationStatus;
  riskRating?: string;
};
