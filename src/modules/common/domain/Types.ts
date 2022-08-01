export type KeysRequired<T> = { [P in keyof Required<T>]: any };

export enum CurrencyType {
  FIAT = "fiat",
  CRYPTO = "crypto",
}
