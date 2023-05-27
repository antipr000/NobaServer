import { Circle } from "../domain/Circle";
import { Result } from "../../../core/logic/Result";

export interface ICircleRepo {
  addConsumerCircleWalletID(consumerID: string, circleWalletID: string): Promise<Circle>;
  getCircleWalletID(consumerID: string): Promise<Result<string>>;
  updateCurrentBalance(walletID: string, balance: number): Promise<Circle>;
  getCircleBalance(consumerOrWalletID: string): Promise<number>;
}
