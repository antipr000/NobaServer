import { Inject, Injectable } from "@nestjs/common";
import { PomeloClient } from "./pomelo.client";
import { POMELO_REPO_PROVIDER } from "./repos/pomelo.repo.module";
import { PomeloRepo } from "./repos/pomelo.repo";
import { ClientCreateUserRequest } from "./dto/pomelo.client.dto";
import { LocationService } from "../../../../common/location.service";
import { uuid } from "uuidv4";
import { NobaCard, NobaCardType } from "../../domain/NobaCard";
import { ServiceErrorCode, ServiceException } from "../../../../../core/exception/service.exception";
import { PomeloCardSaveRequest } from "./domain/PomeloCard";
import { ICardClientService } from "../card.client.service";
import { Consumer } from "../../../../../modules/consumer/domain/Consumer";

@Injectable()
export class PomeloService implements ICardClientService {
  @Inject()
  private readonly pomeloClient: PomeloClient;

  @Inject(POMELO_REPO_PROVIDER)
  private readonly pomeloRepo: PomeloRepo;

  @Inject()
  private readonly locationService: LocationService;

  public async createCard(consumer: Consumer): Promise<NobaCard> {
    let pomeloUser = await this.pomeloRepo.getPomeloUserByConsumerID(consumer.props.id);

    if (!pomeloUser) {
      // Create user in Pomelo

      const locationDetails = await this.locationService.getLocationDetails(consumer.props.address.countryCode);

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

      // TODO: Fill identificatioon_type and identification_value
      const createUserRequest: ClientCreateUserRequest = {
        name: consumer.props.firstName,
        surname: consumer.props.lastName,
        identification_type: "",
        identification_value: "",
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
    const idempotencyKey = uuid();
    const pomeloClientCard = await this.pomeloClient.createCard(idempotencyKey, {
      user_id: pomeloUser.pomeloID,
      card_type: NobaCardType.VIRTUAL,
    });

    const pomeloCardCreateRequest: PomeloCardSaveRequest = {
      pomeloCardID: pomeloClientCard.id,
      pomeloUserID: pomeloUser.id,
      nobaConsumerID: consumer.props.id,
      status: pomeloClientCard.status,
      type: pomeloClientCard.cardType,
    };

    const pomeloCard = await this.pomeloRepo.createPomeloCard(pomeloCardCreateRequest);

    return pomeloCard;
  }
}
