/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */

import type { CryptoWalletsDTO } from "./CryptoWalletsDTO";
import type { DocumentVerificationDTO } from "./DocumentVerificationDTO";
import type { KycVerificationDTO } from "./KycVerificationDTO";
import type { PaymentMethodsDTO } from "./PaymentMethodsDTO";

export type ConsumerDTO = {
  _id: string;
  firstName?: string;
  lastName?: string;
  email: string;
  handle: string;
  status: "Approved" | "Pending" | "ActionRequired" | "TemporaryHold" | "PermanentHold";
  kycVerificationData: KycVerificationDTO;
  documentVerificationData: DocumentVerificationDTO;
  phone?: string;
  dateOfBirth?: string;
  address?: any;
  paymentMethods?: Array<PaymentMethodsDTO>;
  cryptoWallets?: Array<CryptoWalletsDTO>;
  paymentMethodStatus?: "Approved" | "Pending" | "NotSubmitted";
  walletStatus?: "Approved" | "Pending" | "NotSubmitted";
};
