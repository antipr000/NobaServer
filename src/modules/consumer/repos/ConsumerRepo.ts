import { Result } from "../../../core/logic/Result";
import { Consumer } from "../domain/Consumer";

export interface IConsumerRepo {
  getConsumer(consumerID: string): Promise<Consumer>;
  createConsumer(consumer: Consumer): Promise<Consumer>;
  exists(emailOrPhone: string): Promise<boolean>;
  getConsumerByEmail(email: string): Promise<Result<Consumer>>;
  getConsumerByPhone(phone: string): Promise<Result<Consumer>>;
  updateConsumer(consumer: Consumer): Promise<Consumer>;
  isHandleTaken(handle: string): Promise<boolean>;
  updateConsumerCircleWalletID(consumerID: string, circleWalletID: string): Promise<void>;
}
