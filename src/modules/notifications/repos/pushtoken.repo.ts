export interface IPushTokenRepo {
  getPushToken(consumerID: string, pushToken: string): Promise<string>;
  getAllPushTokensForConsumer(consumerID: string): Promise<string[]>;
  addPushToken(consumerID: string, pushToken: string): Promise<string>;
  deletePushToken(consumerID: string, pushToken: string): Promise<string>;
}
