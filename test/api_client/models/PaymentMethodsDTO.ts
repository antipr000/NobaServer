/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */

import type { PaymentMethodACHDataDTO } from "./PaymentMethodACHDataDTO";
import type { PaymentMethodCardDataDTO } from "./PaymentMethodCardDataDTO";

export type PaymentMethodsDTO = {
  name?: string;
  type: "CARD" | "ACH";
  imageUri?: string;
  paymentToken: string;
  cardData?: PaymentMethodCardDataDTO;
  achData?: PaymentMethodACHDataDTO;
  isDefault: boolean;
};
