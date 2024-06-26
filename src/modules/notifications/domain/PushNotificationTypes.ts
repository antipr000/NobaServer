export enum PushNotificationType {
  TRANSACTION_UPDATE = "transactionUpdate",
  SCHEDULED_REMINDER = "scheduledReminder",
}
export class PushNotificationPayload {
  token: string;
  title: string;
  body: string;
  notificationType: PushNotificationType;
  transferCounterPartyHandle?: string;
  transactionRef?: string;
}
