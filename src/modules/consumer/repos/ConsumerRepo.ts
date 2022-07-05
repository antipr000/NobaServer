import { Consumer } from "../domain/Consumer";
import { Result } from "../../../core/logic/Result";

export interface IConsumerRepo {
  getConsumer(consumerID: string): Promise<Consumer>;
  createConsumer(consumer: Consumer): Promise<Consumer>;
  getConsumerIfExists(consumerID: string): Promise<Result<Consumer>>;
  exists(consumerID: string): Promise<boolean>;
  getConsumerByEmail(email: string): Promise<Result<Consumer>>;
  getConsumerByPhone(phone: string): Promise<Result<Consumer>>;
  updateConsumer(consumer: Consumer): Promise<Consumer>;
}
