export interface SMSService {
  sendSMS(recipientPhoneNumber: string, smsBody: string): Promise<void>;
}
