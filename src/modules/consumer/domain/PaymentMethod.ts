import { PaymentMethodStatus } from "./VerificationStatus";

export type PaymentMethod = {
  cardName?: string;
  cardType?: string;
  first6Digits: string;
  last4Digits: string;
  imageUri: string;
  paymentToken: string;
  paymentProviderID: string;
  status?: PaymentMethodStatus;
};
