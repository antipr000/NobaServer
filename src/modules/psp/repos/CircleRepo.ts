import { Result } from "src/core/logic/Result";

// Circle repo stub
export interface ICircleRepo {
  addConsumerCircleWalletID(consumerID: string, circleWalletID: string): Promise<void>; // may need failure state/return
	getWallet(consumerID): Promise<Result<string>>; // guessing result return object here to encapsulate more state
}
