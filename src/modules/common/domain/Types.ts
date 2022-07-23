export type KeysRequired<T> = { [P in keyof Required<T>]: any };

export type CryptoTransactionHandler = {
  onSettled: (transactionHash: string) => void;
  onReceipt?: (receipt: any) => void;
  onError: (error: any) => void;
  onConfirmation?: (confirmationNumber: number) => void;
};

export enum CurrencyType {
  FIAT = "fiat",
  CRYPTO = "crypto",
}
