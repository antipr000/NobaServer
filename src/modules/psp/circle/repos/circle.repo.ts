import { Circle } from "../../domain/Circle";
import { Result } from "../../../../core/logic/Result";

export interface ICircleRepo {
  addConsumerCircleWalletID(consumerID: string, circleWalletID: string): Promise<Circle>;
  getCircleWalletID(consumerID: string): Promise<Result<string>>;
}
