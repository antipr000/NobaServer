import { NobaCard } from "../card/domain/NobaCard";
import { CardResponseDTO } from "../dto/card.controller.dto";

export class CardMapper {
  public toCardResponseDTO(card: NobaCard): CardResponseDTO {
    return {
      id: card.id,
      lastFourDigits: card.last4Digits,
      status: card.status,
      type: card.type,
      consumerID: card.consumerID,
    };
  }
}
