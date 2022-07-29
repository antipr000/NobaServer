// *** DO NOT CHANGE VALUE *** //
export enum TransactionType {
  ONRAMP = "onramp",
  OFFRAMP = "offramp",
  SWAP = "swap",
}

// *** DO NOT CHANGE/REMOVE THE STATUSES ONCE IN PRODUCTION AS EXISTING TRANSACTION WONT BE VALID, WE CAN ONLY ADD NEW STATUS
export enum TransactionStatus {
  PENDING = "PENDING",

  VALIDATION_FAILED = "VALIDATION_FAILED",
  VALIDATION_PASSED = "VALIDATION_PASSED",

  // Onramp transaction statuses
  FIAT_INCOMING_INITIATING = "FIAT_INCOMING_INITIATING",
  FIAT_INCOMING_INITIATED = "FIAT_INCOMING_INITIATED",
  FIAT_INCOMING_COMPLETED = "FIAT_INCOMING_COMPLETED",
  FIAT_INCOMING_FAILED = "FIAT_INCOMING_FAILED",
  FIAT_REVERSAL_INITIATING = "FIAT_REVERSAL_INITIATING",
  FIAT_INCOMING_REVERSAL_INTIIATED = "FIAT_INCOMING_REVERSAL_INITIATED",
  FIAT_INCOMING_REVERSAL_FAILED = "FIAT_INCOMING_REVERSAL_FAILED",
  FIAT_INCOMING_REVERSED = "FIAT_INCOMING_REVERSED",

  CRYPTO_OUTGOING_INITIATING = "CRYPTO_OUTGOING_INITIATING",
  CRYPTO_OUTGOING_INITIATED = "CRYPTO_OUTGOING_INITIATED",
  CRYPTO_OUTGOING_PENDING = "CRYPTO_OUTGOING_PENDING",
  CRYPTO_OUTGOING_COMPLETED = "CRYPTO_OUTGOING_COMPLETED",
  CRYPTO_OUTGOING_FAILED = "CRYPTO_OUTGOING_FAILED",

  //OF-RAMP transaction statuses, complete these when enabling off ramp
  // FIAT_OUTGOING_PENDING = "FIAT_OUTGOING_PENDING",
  // FIAT_OUTGOING_CONFIRMED = "FIAT_OUTGOING_CONFIRMED",
  // FIAT_OUTGOING_FAILED = "FIAT_OUTGOING_FAILED",
  // WALLET_INCOMING_PENDING = "WALLET_INCOMING_PENDING",
  // WALLET_INCOMING_COMPLETED = "WAALLET_INCOMING_COMPLETED",
  // WALLET_INCOMING_FAILED = "WALLET_INCOMING_FAILED",

  // Finality statuses
  COMPLETED = "COMPLETED",
  FAILED = "FAILED",
}

export enum CryptoTransactionStatus {
  INITIATED = "Initiated",
  FAILED = "Failed",
  COMPLETED = "Completed",
}

export interface CryptoTransactionStatusRequestResult {
  status: CryptoTransactionStatus;
  diagnosisMessage?: string;
  onChainTransactionID?: string; // Required only if status=Completed
}

export enum CryptoTransactionRequestResultStatus {
  INITIATED = "Initiated",
  FAILED = "Failed",
  OUT_OF_BALANCE = "OutOfBalance",
}

export interface CryptoTransactionRequestResult {
  status: CryptoTransactionRequestResultStatus;
  diagnosisMessage?: string;
  amountReceived: number;
  exchangeRate: number;
  quoteID: string;
  nobaTransferID?: string;
  tradeID: string;
}
