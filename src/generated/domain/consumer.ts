import { Address } from "./address";
import { Kyc } from "./kyc";
import { CryptoWallet } from "./crypto_wallet";
import { PaymentMethod } from "./payment_method";
import { Circle } from "./circle";
import { Otp } from "./otp";

export class Consumer {
  id: string;

  firstName?: string;

  lastName?: string;

  email?: string;

  displayEmail: string;

  handle?: string;

  phone?: string;

  dateOfBirth?: string;

  isLocked: boolean;

  isDisabled: boolean;

  createdTimestamp?: Date;

  updatedTimestamp?: Date;

  socialSecurityNumber?: string;

  address?: Address;

  verificationData?: Kyc;

  cryptoWallets: CryptoWallet[];

  paymentMethods: PaymentMethod[];

  circleAccountData?: Circle;

  OTP?: Otp;
}
