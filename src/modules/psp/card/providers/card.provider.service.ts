import { Consumer } from "../../../consumer/domain/Consumer";
import { NobaCard, NobaCardType } from "../domain/NobaCard";

export interface ICardProviderService {
  createCard(consumer: Consumer, type: NobaCardType): Promise<NobaCard>;
}
