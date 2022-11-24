/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */

import type { ACHDetailsDTO } from "./ACHDetailsDTO";
import type { CardDetailsDTO } from "./CardDetailsDTO";

export type AddPaymentMethodDTO = {
  name?: string;
  type: "Card" | "ACH";
  cardDetails?: CardDetailsDTO;
  achDetails?: ACHDetailsDTO;
  imageUri?: string;
  isDefault?: boolean;
};
