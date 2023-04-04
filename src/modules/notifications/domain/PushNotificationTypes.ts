export class PushNotificationPayload {
  token: string;
  templateKey: string;
  params: PushNotificationParams;
  targetScreen?: string;
  transferCounterPartyHandle?: string;
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
