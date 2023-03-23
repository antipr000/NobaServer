import { Inject, Injectable } from "@nestjs/common";
import { PomeloClient } from "./pomelo.client";
import { POMELO_REPO_PROVIDER } from "./repos/pomelo.repo.module";
import { PomeloRepo } from "./repos/pomelo.repo";
import { ConsumerService } from "../../../modules/consumer/consumer.service";
import { ClientCreateUserRequest } from "./dto/pomelo.client.dto";
import { LocationService } from "../../../modules/common/location.service";
import { uuid } from "uuidv4";
import { CardType, PomeloCard } from "./domain/PomeloCard";

@Injectable()
export class PomeloService {
  @Inject()
  private readonly pomeloClient: PomeloClient;

  @Inject(POMELO_REPO_PROVIDER)
  private readonly pomeloRepo: PomeloRepo;

  @Inject()
  private readonly consumerService: ConsumerService;

  @Inject()
  private readonly locationService: LocationService;

  public async createCard(consumerID: string): Promise<PomeloCard> {
    const consumer = await this.consumerService.getActiveConsumer(consumerID);

    let pomeloUser = await this.pomeloRepo.getPomeloUserByConsumerID(consumerID);

    if (!pomeloUser) {
      // Create user in Pomelo

      const locationDetails = await this.locationService.getLocationDetails(consumer.props.address.countryCode);

      const subdivisionDetails = locationDetails.subdivisions.find(
        subdivision => subdivision.code === consumer.props.address.regionCode,
      );

      if (!subdivisionDetails) {
        throw new Error("Could not find subdivision details for region code");
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
          zip_code: consumer.props.address.postalCode,
          city: consumer.props.address.city,
          region: subdivisionDetails.name,
          country: locationDetails.alpha3ISOCode,
        },
      };

      const pomeloClientUser = await this.pomeloClient.createUser(consumerID, createUserRequest);

      pomeloUser = await this.pomeloRepo.createPomeloUser({
        consumerID,
        pomeloUserID: pomeloClientUser.id,
      });
    }

    // Create card in Pomelo
    const idempotencyKey = uuid();
    const pomeloCard = await this.pomeloClient.createCard(idempotencyKey, {
      user_id: pomeloUser.pomeloID,
      card_type: CardType.VIRTUAL,
    });

    // TODO: Create card in our DB

    return pomeloCard;
  }
}
