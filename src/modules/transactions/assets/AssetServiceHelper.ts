import { Utils } from "../../../core/utils/Utils";
import { DiscountedAmount } from "../domain/AssetTypes";

export function getDiscountedAmount(value: number, discountPercent: number, roundTo?: number): DiscountedAmount {
  if (!discountPercent) discountPercent = 0;

  console.log(discountPercent);
  return {
    value: roundTo ? Utils.roundToSpecifiedDecimalNumber(value, roundTo) : value,
    discountedValue: roundTo
      ? Utils.roundToSpecifiedDecimalNumber(value * (1.0 - discountPercent), roundTo)
      : value * (1.0 - discountPercent),
  };
}
