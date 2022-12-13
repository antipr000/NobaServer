import { Consumer } from "./consumer";
import { Card } from "./card";
import { AchData } from "./ach_data";
import { PaymentMethodType, PaymentProvider, PaymentMethodStatus } from "@prisma/client";

export class PaymentMethod {
  id: number;

  name?: string;

  type: PaymentMethodType;

  paymentToken: string;

  paymentProvider: PaymentProvider;

  status: PaymentMethodStatus;

  isDefault: boolean;

  imageUri?: string;

  consumer: Consumer;

  consumerID: string;

  cardData?: Card;

  achData?: AchData;
}
