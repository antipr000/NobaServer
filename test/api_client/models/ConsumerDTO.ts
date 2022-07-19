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
  kycVerificationData: KycVerificationDTO;
  documentVerificationData: DocumentVerificationDTO;
  phone?: string;
  dateOfBirth?: string;
  address?: any;
  isSuspectedFraud: boolean;
  isLocked: boolean;
  isDeleted?: boolean;
  paymentMethods?: Array<PaymentMethodsDTO>;
  cryptoWallets?: Array<CryptoWalletsDTO>;
};
