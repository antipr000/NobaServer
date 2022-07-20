import { PaymentMethodStatus } from "./VerificationStatus";

export type PaymentMethods = {
  cardName?: string;
  cardType?: string;
  first6Digits: string;
  last4Digits: string;
  imageUri: string;
  paymentToken: string;
  paymentProviderID: string;
  status?: PaymentMethodStatus;
};
