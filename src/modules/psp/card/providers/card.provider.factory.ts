import { Inject, Injectable } from "@nestjs/common";
import { PomeloService } from "./pomelo/pomelo.service";
import { ICardProviderService } from "./card.provider.service";
import { ServiceErrorCode, ServiceException } from "../../../../core/exception/service.exception";
import { CardProvider } from "../domain/NobaCard";

@Injectable()
export class CardProviderFactory {
  @Inject()
  private readonly pomeloService: PomeloService;

  public getCardProviderService(countryCode: string): ICardProviderService {
    switch (countryCode) {
      case "CO":
        return this.pomeloService;
      default:
        throw new ServiceException({
          message: "Card service is not available for the requested country",
          errorCode: ServiceErrorCode.UNABLE_TO_PROCESS,
        });
    }
  }

  public getCardProviderServiceByProvider(provider: CardProvider): ICardProviderService {
    switch (provider) {
      case CardProvider.POMELO:
        return this.pomeloService;
      default:
        throw new ServiceException({
          message: "Card provider is invalid",
          errorCode: ServiceErrorCode.UNABLE_TO_PROCESS,
        });
    }
  }
}
