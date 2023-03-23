import { Consumer } from "../../../../modules/consumer/domain/Consumer";
import { NobaCard } from "../domain/NobaCard";

export interface ICardClientService {
  createCard(consumer: Consumer): Promise<NobaCard>;
}
