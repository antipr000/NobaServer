import { Inject, Injectable } from "@nestjs/common";
import { NobaCard, NobaCardType } from "./domain/NobaCard";
import { CardProviderFactory } from "./providers/card.provider.factory";
import { ConsumerService } from "../../../modules/consumer/consumer.service";
import { ServiceErrorCode, ServiceException } from "../../../core/exception/service.exception";
import { NOBA_CARD_REPO_PROVIDER } from "./repos/card.repo.module";
import { NobaCardRepo } from "./repos/card.repo";
import { WebViewTokenResponseDTO } from "../dto/card.controller.dto";

@Injectable()
export class CardService {
  @Inject()
  private readonly cardProviderFactory: CardProviderFactory;

  @Inject()
  private readonly consumerService: ConsumerService;

  @Inject(NOBA_CARD_REPO_PROVIDER)
  private readonly cardRepo: NobaCardRepo;

  public async createCard(consumerID: string, cardType: NobaCardType): Promise<NobaCard> {
    const consumer = await this.consumerService.getActiveConsumer(consumerID);

    if (!consumer) {
      throw new ServiceException({
        message: "Consumer does not exist or is not active",
        errorCode: ServiceErrorCode.DOES_NOT_EXIST,
      });
    }

    if (!consumer.props.address) {
      throw new ServiceException({
        message: "Unable to process card request without address",
        errorCode: ServiceErrorCode.SEMANTIC_VALIDATION,
      });
    }

    const cardProviderService = this.cardProviderFactory.getCardProviderService(consumer.props.address.countryCode);

    return cardProviderService.createCard(consumer, cardType);
  }

  public async getAllCardsForConsumer(consumerID: string): Promise<NobaCard[]> {
    if (!consumerID) {
      throw new ServiceException({
        message: "Consumer ID is required",
        errorCode: ServiceErrorCode.SEMANTIC_VALIDATION,
      });
    }

    const consumer = await this.consumerService.getActiveConsumer(consumerID);

    if (!consumer) {
      throw new ServiceException({
        message: "Consumer does not exist or is not active",
        errorCode: ServiceErrorCode.DOES_NOT_EXIST,
      });
    }
    return this.cardRepo.getCardsByConsumerID(consumerID);
  }

  public async getCard(cardID: string, consumerID: string): Promise<NobaCard> {
    if (!cardID) {
      throw new ServiceException({
        message: "Card ID is required",
        errorCode: ServiceErrorCode.SEMANTIC_VALIDATION,
      });
    }

    if (!consumerID) {
      throw new ServiceException({
        message: "Consumer ID is required",
        errorCode: ServiceErrorCode.SEMANTIC_VALIDATION,
      });
    }

    const card = await this.cardRepo.getCardByID(cardID);

    if (!card) {
      throw new ServiceException({
        message: "Card does not exist",
        errorCode: ServiceErrorCode.DOES_NOT_EXIST,
      });
    }

    if (card.consumerID !== consumerID) {
      throw new ServiceException({
        message: "Card does not belong to consumer",
        errorCode: ServiceErrorCode.SEMANTIC_VALIDATION,
      });
    }

    return card;
  }

  async getWebViewToken(cardID: string, consumerID: string): Promise<WebViewTokenResponseDTO> {
    const card = await this.getCard(cardID, consumerID);

    const cardProviderService = this.cardProviderFactory.getCardProviderServiceByProvider(card.provider);

    return cardProviderService.getWebViewToken(card);
  }
}
