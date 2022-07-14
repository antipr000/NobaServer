/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */

import type { PeriodLimit } from "./PeriodLimit";

export type ConsumerLimitsDTO = {
  minTransaction: number;
  maxTransaction: number;
  monthly: PeriodLimit;
  weekly?: PeriodLimit;
  daily?: PeriodLimit;
};
