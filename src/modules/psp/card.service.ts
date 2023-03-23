import { Card } from "./domain/Card";

export interface ICardService {
  createCard(consumerID: string): Promise<Card>;
}
