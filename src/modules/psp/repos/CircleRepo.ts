import { Result } from "src/core/logic/Result";

// Circle repo stub
export interface ICircleRepo {
  addConsumerCircleWalletID(consumerID: string, circleWalletID: string): Promise<void>;
	getWallet(consumerID): Promise<Result<string>>; // guessing result here to encapsulate more state
}
