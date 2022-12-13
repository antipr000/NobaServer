import { PaymentMethod } from "./payment_method";

export class AchData {
  id: number;

  accountID: string;

  accessToken: string;

  itemID: string;

  mask: string;

  accountType: string;

  paymentMethod: PaymentMethod;

  paymentMethodID: number;
}
