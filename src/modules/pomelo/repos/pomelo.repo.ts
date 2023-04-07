import { NobaCard } from "../../psp/card/domain/NobaCard";
import { PomeloCard, PomeloCardSaveRequest, PomeloCardUpdateRequest } from "../domain/PomeloCard";
import { PomeloTransactionSaveRequest, PomeloTransaction, PomeloTransactionStatus } from "../domain/PomeloTransaction";
import { PomeloUser, PomeloUserSaveRequest } from "../domain/PomeloUser";

export interface PomeloRepo {
  createPomeloUser(request: PomeloUserSaveRequest): Promise<PomeloUser>;
  getPomeloUserByConsumerID(consumerID: string): Promise<PomeloUser>;
  getPomeloUserByPomeloUserID(pomeloUserID: string): Promise<PomeloUser>;

  createPomeloCard(request: PomeloCardSaveRequest): Promise<NobaCard>;
  updatePomeloCard(request: PomeloCardUpdateRequest): Promise<NobaCard>;
  getPomeloCardByPomeloCardID(pomeloCardID: string): Promise<PomeloCard>;
  getPomeloCardByNobaCardID(nobaCardID: string): Promise<PomeloCard>;
  getNobaConsumerIDHoldingPomeloCard(pomeloCardID: string, pomeloUserID: string): Promise<string>;

  createPomeloTransaction(request: PomeloTransactionSaveRequest): Promise<PomeloTransaction>;
  updatePomeloTransactionStatus(pomeloTransactionID: string, status: PomeloTransactionStatus): Promise<void>;
  getPomeloTransactionByNobaTransactionID(nobaTransactionID: string): Promise<PomeloTransaction>;
  getPomeloTransactionByPomeloIdempotencyKey(pomeloIdempotencyKey: string): Promise<PomeloTransaction>;
}
