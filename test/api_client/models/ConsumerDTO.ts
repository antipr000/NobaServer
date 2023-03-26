/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */

import type { AddressDTO } from "./AddressDTO";
import type { CryptoWalletsDTO } from "./CryptoWalletsDTO";
import type { DocumentVerificationDTO } from "./DocumentVerificationDTO";
import type { KycVerificationDTO } from "./KycVerificationDTO";
import type { PaymentMethodsDTO } from "./PaymentMethodsDTO";

export type ConsumerDTO = {
  id: string;
  firstName?: string;
  lastName?: string;
  email: string;
  handle?: string;
  gender?: "Male" | "Female";
  referralCode: string;
  status: "Approved" | "Pending" | "ActionRequired" | "TemporaryHold" | "PermanentHold";
  kycVerificationData: KycVerificationDTO;
  documentVerificationData: DocumentVerificationDTO;
  phone?: string;
  dateOfBirth?: string;
  address?: AddressDTO;
  paymentMethods?: Array<PaymentMethodsDTO>;
  cryptoWallets?: Array<CryptoWalletsDTO>;
  paymentMethodStatus?: "Approved" | "Pending" | "NotSubmitted";
  walletStatus?: "Approved" | "Pending" | "NotSubmitted";
};
