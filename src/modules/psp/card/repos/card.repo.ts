import { NobaCard } from "../domain/NobaCard";

export interface NobaCardRepo {
  getCardsByConsumerID(consumerID: string): Promise<NobaCard[]>;
  getCardByID(id: string): Promise<NobaCard>;
}
