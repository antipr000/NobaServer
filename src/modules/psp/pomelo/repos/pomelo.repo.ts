import { PomeloUser, PomeloUserSaveRequest } from "../domain/PomeloUser";

export interface PomeloRepo {
  createPomeloUser(request: PomeloUserSaveRequest): Promise<PomeloUser>;
  getPomeloUserByConsumerID(consumerID: string): Promise<PomeloUser>;
  getPomeloUserByPomeloID(pomeloUserID: string): Promise<PomeloUser>;
}
