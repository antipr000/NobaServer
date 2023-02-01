// We must have an entry here for every row in https://www.notion.so/onenoba/Monitoring-dd4768dca6bf4bb9a7e4056eacab6d5c
export enum AlertKey {
  TEMPORAL_DOWN = "TEMPORAL_DOWN",
  STALE_FX_RATES = "STALE_FX_RATES",
}

export class Alert {
  key: AlertKey;
  message: string;
}

export function formatAlertLog(alert: Alert): string {
  return `CRITICAL ALERT! ${JSON.stringify(alert)}`;
}
