// We must have an entry here for every row in https://www.notion.so/onenoba/Monitoring-dd4768dca6bf4bb9a7e4056eacab6d5c
export enum AlertKey {
  TEMPORAL_DOWN = "TEMPORAL_DOWN",
  STALE_FX_RATES = "STALE_FX_RATES",
  EXCHANGE_RATE_UPDATE_FAILED = "EXCHANGE_RATE_UPDATE_FAILED",
  MONO_TRANSACTION_NOT_FOUND = "MONO_TRANSACTION_NOT_FOUND",
  WEBHOOK_CONSUMER_NOT_FOUND = "WEBHOOK_CONSUMER_NOT_FOUND",
  TRANSACTION_FAILED = "TRANSACTION_FAILED",
}

export class Alert {
  key: AlertKey;
  message: string;
}
