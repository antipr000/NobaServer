export interface IPushTokenRepo {
  getPushToken(consumerID: string, pushToken: string): Promise<string>;
  addPushToken(consumerID: string, pushToken: string): Promise<string>;
}
