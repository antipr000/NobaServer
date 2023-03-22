import { PomeloCard } from "@prisma/client";
import { PomeloCardSaveRequest, PomeloCardUpdateRequest } from "../domain/PomeloCard";
import { PomeloUser, PomeloUserSaveRequest } from "../domain/PomeloUser";

export interface PomeloRepo {
  createPomeloUser(request: PomeloUserSaveRequest): Promise<PomeloUser>;
  getPomeloUserByConsumerID(consumerID: string): Promise<PomeloUser>;
  getPomeloUserByPomeloID(pomeloUserID: string): Promise<PomeloUser>;

  createPomeloCard(request: PomeloCardSaveRequest): Promise<PomeloCard>;
  updatePomeloCard(request: PomeloCardUpdateRequest): Promise<PomeloCard>;
  getPomeloCard(consumerID: string, pomeloCardID: string): Promise<PomeloCard>;
  getPomeloCardByID(id: string): Promise<PomeloCard>;
}
