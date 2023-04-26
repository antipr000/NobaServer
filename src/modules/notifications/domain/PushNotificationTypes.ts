export enum PushNotificationType {
  TRANSACTION_UPDATE = "transactionUpdate",
}
export class PushNotificationPayload {
  token: string;
  templateKey: string;
  body: string;
  notificationType: PushNotificationType;
  transferCounterPartyHandle?: string;
  transactionRef?: string;
}
