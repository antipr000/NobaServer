import { Inject, Injectable } from "@nestjs/common";
import { PomeloClient } from "./pomelo.client";
import { POMELO_REPO_PROVIDER } from "../repos/pomelo.repo.module";
import { PomeloRepo } from "../repos/pomelo.repo";
import { ClientCreateUserRequest } from "../dto/pomelo.client.dto";
import { LocationService } from "../../common/location.service";
import { CardProvider, NobaCard, NobaCardType } from "../../psp/card/domain/NobaCard";
import { ServiceErrorCode, ServiceException } from "../../../core/exception/service.exception";
import { PomeloCardSaveRequest } from "../domain/PomeloCard";
import { ICardProviderService } from "../../psp/card/providers/card.provider.service";
import { Consumer } from "../../consumer/domain/Consumer";
import { ConsumerService } from "../../consumer/consumer.service";
import { countryToSupportedIdentificationTypes } from "../domain/PomeloConstants";
import CryptoJS from "crypto-js";
import { WebViewTokenResponseDTO } from "../../psp/dto/card.controller.dto";

@Injectable()
export class PomeloService implements ICardProviderService {
  @Inject()
  private readonly pomeloClient: PomeloClient;

  @Inject()
  private readonly consumerService: ConsumerService;

  @Inject(POMELO_REPO_PROVIDER)
  private readonly pomeloRepo: PomeloRepo;

  @Inject()
  private readonly locationService: LocationService;

  public async createCard(consumer: Consumer, type: NobaCardType): Promise<NobaCard> {
    let pomeloUser = await this.pomeloRepo.getPomeloUserByConsumerID(consumer.props.id);

    if (!pomeloUser) {
      // Create user in Pomelo

      const locationDetails = this.locationService.getLocationDetails(consumer.props.address.countryCode);

      if (!locationDetails) {
        throw new ServiceException({
          message: "Could not find location details for country code",
          errorCode: ServiceErrorCode.DOES_NOT_EXIST,
        });
      }

      const subdivisionDetails = locationDetails.subdivisions.find(
        subdivision => subdivision.code === consumer.props.address.regionCode,
      );

      if (!subdivisionDetails) {
        throw new ServiceException({
          message: "Could not find subdivision details for region code",
          errorCode: ServiceErrorCode.DOES_NOT_EXIST,
        });
      }

      const phoneWithoutExtension = consumer.props.phone.replace(`+${locationDetails.dialingPrefix}`, "");

      const allIdentificationsForConsumer = await this.consumerService.getAllIdentifications(consumer.props.id);

      const acceptableDocuments = countryToSupportedIdentificationTypes[consumer.props.address.countryCode];

      const identification = allIdentificationsForConsumer.find(
        identification =>
          acceptableDocuments.includes(identification.type) &&
          identification.countryCode === consumer.props.address.countryCode,
      );

      if (!identification) {
        throw new ServiceException({
          message: "Could not find identification for consumer. Supported types: CC, CE, PASSPORT, PEP",
          errorCode: ServiceErrorCode.DOES_NOT_EXIST,
        });
      }

      // TODO: Fill identificatioon_type and identification_value
      const createUserRequest: ClientCreateUserRequest = {
        name: consumer.props.firstName,
        surname: consumer.props.lastName,
        identification_type: identification.type,
        identification_value: identification.value,
        birthdate: consumer.props.dateOfBirth,
        gender: consumer.props.gender,
        email: consumer.props.email,
        phone: phoneWithoutExtension,
        operation_country: locationDetails.alpha3ISOCode,
        legal_address: {
          street_name: consumer.props.address.streetLine1,
          ...(consumer.props.address.streetLine2 && { additional_info: consumer.props.address.streetLine2 }),
          zip_code: consumer.props.address.postalCode,
          city: consumer.props.address.city,
          region: subdivisionDetails.name,
          country: locationDetails.alpha3ISOCode,
        },
      };

      const pomeloClientUser = await this.pomeloClient.createUser(consumer.props.id, createUserRequest);

      pomeloUser = await this.pomeloRepo.createPomeloUser({
        consumerID: consumer.props.id,
        pomeloUserID: pomeloClientUser.id,
      });
    }

    // Create card in Pomelo
    const idempotencyKey = String(CryptoJS.SHA256(`${pomeloUser.id}-${type}`));
    const pomeloClientCard = await this.pomeloClient.createCard(idempotencyKey, {
      user_id: pomeloUser.pomeloID,
      card_type: type,
    });

    const pomeloCardCreateRequest: PomeloCardSaveRequest = {
      pomeloCardID: pomeloClientCard.id,
      pomeloUserID: pomeloUser.pomeloID,
      nobaConsumerID: consumer.props.id,
      status: pomeloClientCard.status,
      type: pomeloClientCard.cardType,
      last4Digits: pomeloClientCard.lastFour,
    };

    const pomeloCard = await this.pomeloRepo.createPomeloCard(pomeloCardCreateRequest);

    return pomeloCard;
  }

  public async getWebViewToken(nobaCard: NobaCard): Promise<WebViewTokenResponseDTO> {
    const pomeloCard = await this.pomeloRepo.getPomeloCardByNobaCardID(nobaCard.id);
    if (!pomeloCard) {
      throw new ServiceException({
        message: "Could not find card",
        errorCode: ServiceErrorCode.DOES_NOT_EXIST,
      });
    }

    const accessToken = await this.pomeloClient.createUserToken(pomeloCard.pomeloUserID);

    return {
      accessToken,
      providerCardID: pomeloCard.pomeloCardID,
      provider: CardProvider.POMELO,
    };
  }
}
