/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */

export type CurrencyDTO = {
  _id: string;
  type: "fiat" | "crypto";
  name: string;
  ticker: string;
  iconPath: string;
};
