export interface SMSClient {
  sendSMS(recipientPhoneNumber: string, smsBody: string): Promise<void>;
}
