export enum PushNotificationType {
  TRANSACTION_UPDATE = "transactionUpdate",
}
export class PushNotificationPayload {
  token: string;
  templateKey: string;
  params: PushNotificationParams;
  notificationType: PushNotificationType;
  transferCounterPartyHandle?: string;
  transactionRef?: string;
}

export class PushNotificationParams {
  transactionParams?: {
    amount?: number;
    currency?: string;
    senderHandle?: string;
    receiverHandle?: string;
  };
  payrollParams?: {
    companyName?: string;
  };
}
