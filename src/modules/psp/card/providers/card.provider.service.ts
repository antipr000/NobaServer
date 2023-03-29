import { Consumer } from "../../../consumer/domain/Consumer";
import { WebViewTokenResponseDTO } from "../../dto/card.controller.dto";
import { NobaCard, NobaCardType } from "../domain/NobaCard";

export interface ICardProviderService {
  createCard(consumer: Consumer, type: NobaCardType): Promise<NobaCard>;
  getWebViewToken(nobaCard: NobaCard): Promise<WebViewTokenResponseDTO>;
}
