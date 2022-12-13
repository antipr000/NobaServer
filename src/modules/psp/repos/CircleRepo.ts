// Circle repo stub
export interface ICircleRepo {
  addConsumerCircleWalletID(consumerID: string, circleWalletID: string): Promise<void>;
}
