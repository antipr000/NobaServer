import { Circle, CircleCreateRequest, CircleUpdateRequest } from "../domain/Circle";
import { Result } from "../../../core/logic/Result";

export interface ICircleRepo {
  addConsumerCircleWalletID(request: CircleCreateRequest): Promise<Circle>;
  getCircleWalletID(consumerID: string): Promise<Result<string>>;
  updateCurrentBalance(walletID: string, request: CircleUpdateRequest): Promise<Circle>;
  getCircleBalance(consumerOrWalletID: string): Promise<number>;
}
