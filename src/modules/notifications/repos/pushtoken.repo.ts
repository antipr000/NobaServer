export interface IPushtokenRepo {
  getPushTokens(consumerID: string): Promise<string[]>;
  addPushToken(consumerID: string, pushToken: string): Promise<string>;
}
