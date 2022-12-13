import { PaymentMethod } from "./payment_method";

export class Card {
  id: number;

  cardType?: string;

  scheme?: string;

  first6Digits: string;

  last4Digits: string;

  authCode?: string;

  authReason?: string;

  paymentMethod: PaymentMethod;

  paymentMethodID: number;
}
