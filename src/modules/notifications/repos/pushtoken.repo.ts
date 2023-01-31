export interface IPushtokenRepo {
  getPushToken(consumerID: string, pushToken: string): Promise<string>;
  addPushToken(consumerID: string, pushToken: string): Promise<string>;
}
