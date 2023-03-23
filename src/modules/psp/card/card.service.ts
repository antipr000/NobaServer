import { Inject, Injectable } from "@nestjs/common";
import { NobaCard } from "./domain/NobaCard";
import { CardClientFactory } from "./clients/card.client.factory";
import { ConsumerService } from "../../../modules/consumer/consumer.service";
import { ServiceErrorCode, ServiceException } from "../../../core/exception/service.exception";

@Injectable()
export class CardService {
  @Inject()
  private readonly cardClientFactory: CardClientFactory;

  @Inject()
  private readonly consumerService: ConsumerService;

  public async createCard(consumerID: string): Promise<NobaCard> {
    const consumer = await this.consumerService.getActiveConsumer(consumerID);

    if (!consumer) {
      throw new ServiceException({
        message: "Consumer does not exist",
        errorCode: ServiceErrorCode.DOES_NOT_EXIST,
      });
    }

    if (!consumer.props.address) {
      throw new ServiceException({
        message: "Unable to process card request without address",
        errorCode: ServiceErrorCode.SEMANTIC_VALIDATION,
      });
    }

    const cardClientService = this.cardClientFactory.getCardClientService(consumer.props.address.countryCode);

    return cardClientService.createCard(consumer);
  }
}
