import { Inject, Injectable } from "@nestjs/common";
import { PomeloService } from "./pomelo/pomelo.service";
import { ICardClientService } from "./card.client.service";
import { ServiceErrorCode, ServiceException } from "../../../../core/exception/service.exception";

@Injectable()
export class CardClientFactory {
  @Inject()
  private readonly pomeloService: PomeloService;

  public getCardClientService(countryCode: string): ICardClientService {
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
}
