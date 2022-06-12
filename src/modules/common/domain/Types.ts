export type KeysRequired<T> = { [P in keyof Required<T>]: any };

export type Web3TransactionHandler = {
  onTransactionHash: (transactionHash: string) => void;
  onReceipt?: (receipt: any) => void;
  onError: (error: any) => void;
  onConfirmation?: (confirmationNumber: number) => void;
};
