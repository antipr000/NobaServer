import { NobaCard } from "../../psp/card/domain/NobaCard";
import { PomeloCard, PomeloCardSaveRequest, PomeloCardUpdateRequest } from "../domain/PomeloCard";
import { PomeloTransactionSaveRequest, PomeloTransaction } from "../domain/PomeloTransaction";
import { PomeloUser, PomeloUserSaveRequest } from "../domain/PomeloUser";

export interface PomeloRepo {
  createPomeloUser(request: PomeloUserSaveRequest): Promise<PomeloUser>;
  getPomeloUserByConsumerID(consumerID: string): Promise<PomeloUser>;
  getPomeloUserByPomeloUserID(pomeloUserID: string): Promise<PomeloUser>;

  createPomeloCard(request: PomeloCardSaveRequest): Promise<NobaCard>;
  updatePomeloCard(request: PomeloCardUpdateRequest): Promise<NobaCard>;
  getPomeloCardByPomeloCardID(pomeloCardID: string): Promise<PomeloCard>;
  getPomeloCardByNobaCardID(nobaCardID: string): Promise<PomeloCard>;

  createPomeloTransaction(request: PomeloTransactionSaveRequest): Promise<PomeloTransaction>;
  getPomeloTransactionByNobaTransactionID(nobaTransactionID: string): Promise<PomeloTransaction>;
  getPomeloTransactionByPomeloIdempotencyKey(pomeloIdempotencyKey: string): Promise<PomeloTransaction>;
}
