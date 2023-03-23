import { NobaCard } from "../domain/NobaCard";

export interface NobaCardRepo {
  getCardsByConsumerID(consumerID: string): Promise<NobaCard[]>;
  getCardsByID(id: string): Promise<NobaCard>;
}
