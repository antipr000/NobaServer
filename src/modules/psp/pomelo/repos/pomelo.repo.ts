import { NobaCard } from "../../card/domain/NobaCard";
import { PomeloCard, PomeloCardSaveRequest, PomeloCardUpdateRequest } from "../domain/PomeloCard";
import { PomeloUser, PomeloUserSaveRequest } from "../domain/PomeloUser";

export interface PomeloRepo {
  createPomeloUser(request: PomeloUserSaveRequest): Promise<PomeloUser>;
  getPomeloUserByConsumerID(consumerID: string): Promise<PomeloUser>;
  getPomeloUserByPomeloID(pomeloUserID: string): Promise<PomeloUser>;

  createPomeloCard(request: PomeloCardSaveRequest): Promise<NobaCard>;
  updatePomeloCard(request: PomeloCardUpdateRequest): Promise<NobaCard>;
  getPomeloCardByPomeloCardID(pomeloCardID: string): Promise<PomeloCard>;
  getPomeloCardByNobaCardID(nobaCardID: string): Promise<PomeloCard>;
}