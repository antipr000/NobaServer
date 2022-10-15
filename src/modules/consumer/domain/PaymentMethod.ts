import { PaymentProvider } from "./PaymentProvider";
import { PaymentMethodStatus } from "./VerificationStatus";

export type PaymentMethod = {
  // User provided name of the payment method.
  name?: string;
  type: PaymentMethodType;
  cardData?: CardData; // (will be populated if type == Card)
  achData?: ACHData; // (will be populated if type == ACH)
  imageUri: string;
  // External opaque ID which "payment provider" uses to refer this payment method.
  paymentToken: string;
  paymentProviderID: PaymentProvider;
  status?: PaymentMethodStatus;
};

export enum PaymentMethodType {
  CARD = "Card",
  ACH = "ACH",
}

export type CardData = {
  cardType?: string;
  first6Digits: string;
  last4Digits: string;
  authCode?: string;
  authReason?: string;
};

export type ACHData = {
  // Plaid's unique ID for this account.
  accountID: string;
  // [Encrypted] token from Plaid required to access this account.
  accessToken: string;
  // Identifier known to Plaid for referencing this account.
  itemID: string;
  // Last 4 digits of linked account number.
  last4Digits: string;
};
