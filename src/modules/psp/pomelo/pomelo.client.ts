import { HttpStatus, Inject, Injectable } from "@nestjs/common";
import { CustomConfigService } from "../../../core/utils/AppConfigModule";
import { WINSTON_MODULE_PROVIDER } from "nest-winston";
import { Logger } from "winston";
import { PomeloConfigs } from "../../../config/configtypes/PomeloConfigs";
import { POMELO_CONFIG_KEY } from "../../../config/ConfigurationUtils";
import axios from "axios";
import {
  CreateCardRequest,
  CreateUserRequest,
  PomeloCard,
  UpdateCardRequest,
  UpdateUserRequest,
} from "./dto/pomelo.client.dto";
import { ServiceErrorCode, ServiceException } from "../../../core/exception/service.exception";

@Injectable()
export class PomeloClient {
  private readonly pomeloConfigs: PomeloConfigs;

  constructor(
    private readonly configService: CustomConfigService,
    @Inject(WINSTON_MODULE_PROVIDER) private readonly logger: Logger,
  ) {
    this.pomeloConfigs = this.configService.get<PomeloConfigs>(POMELO_CONFIG_KEY);
  }

  private async getAccessToken(): Promise<string> {
    const url = `${this.pomeloConfigs.authBaseUrl}/oauth/token`;
    const body = {
      client_id: this.pomeloConfigs.clientID,
      client_secret: this.pomeloConfigs.clientSecret,
      audience: this.pomeloConfigs.audience,
      grant_type: "client_credentials",
    };

    try {
      const { data } = await axios.post(url, body, {
        headers: {
          "Content-Type": "application/json; charset=utf-8",
        },
      });

      return data.access_token;
    } catch (error) {
      this.logger.error(`Failed to fetch access token from Pomelo. Reason: ${JSON.stringify(error)}`);
      throw new ServiceException({
        message: "Failed to fetch access token from Pomelo",
        errorCode: ServiceErrorCode.UNKNOWN,
      });
    }
  }

  public async createUser(request: CreateUserRequest): Promise<string> {
    const url = `${this.pomeloConfigs.apiBaseUrl}/users/v1`;

    const body = {
      name: request.firstName,
      surname: request.lastName,
      birthdate: request.dateOfBirth,
      email: request.email,
      phone: request.phoneNumber,
      identification_type: request.identificationType,
      identification_value: request.identificationNumber,
      gender: request.gender,
      legal_address: {
        street_name: request.address.streetName,
        zip_code: request.address.pinCode,
        city: request.address.city,
        region: request.address.region,
        country: request.countryCode,
      },
      operation_country: request.countryCode,
    };

    const accessToken = await this.getAccessToken();

    try {
      const { data } = await axios.post(url, body, {
        headers: {
          "Content-Type": "application/json; charset=utf-8",
          Authorization: `Bearer ${accessToken}`,
          "x-idempotency-key": request.consumerID,
        },
      });

      return data.data.id;
    } catch (e) {
      this.logger.error(`Failed to create user in Pomelo. Reason: ${JSON.stringify(e)}`);
      throw new ServiceException({
        message: "Failed to create user in Pomelo",
        errorCode: ServiceErrorCode.UNKNOWN,
      });
    }
  }

  public async getUser(id: string): Promise<any> {
    const url = `${this.pomeloConfigs.apiBaseUrl}/users/v1/${id}`;

    const accessToken = await this.getAccessToken();

    try {
      const { data } = await axios.get(url, {
        headers: {
          "Content-Type": "application/json; charset=utf-8",
          Authorization: `Bearer ${accessToken}`,
        },
      });

      return data.data;
    } catch (e) {
      this.logger.error(`Failed to get user from Pomelo. Reason: ${JSON.stringify(e)}`);
      if (e.response.status === HttpStatus.NOT_FOUND) {
        throw new ServiceException({
          message: "User not found in Pomelo",
          errorCode: ServiceErrorCode.DOES_NOT_EXIST,
        });
      }
      throw new ServiceException({
        message: "Failed to get user from Pomelo",
        errorCode: ServiceErrorCode.UNKNOWN,
      });
    }
  }

  public async updateUser(id: string, request: UpdateUserRequest): Promise<string> {
    const url = `${this.pomeloConfigs.apiBaseUrl}/users/v1/${id}`;
    const body = {
      ...(request.firstName && { name: request.firstName }),
      ...(request.lastName && { surname: request.lastName }),
      ...(request.dateOfBirth && { birthdate: request.dateOfBirth }),
      ...(request.email && { email: request.email }),
      ...(request.phoneNumber && { phone: request.phoneNumber }),
      ...(request.identificationType && { identification_type: request.identificationType }),
      ...(request.identificationNumber && { identification_value: request.identificationNumber }),
      ...(request.gender && { gender: request.gender }),
      ...(request.address && {
        legal_address: {
          street_name: request.address.streetName,
          zip_code: request.address.pinCode,
          city: request.address.city,
          region: request.address.region,
          country: request.address.country,
        },
      }),
      ...(request.status && { status: request.status }),
      ...(request.statusReason && { status_reason: request.statusReason }),
    };

    const accessToken = await this.getAccessToken();

    try {
      const { data } = await axios.patch(url, body, {
        headers: {
          "Content-Type": "application/json; charset=utf-8",
          Authorization: `Bearer ${accessToken}`,
        },
      });

      return data.data.id;
    } catch (e) {
      this.logger.error(`Failed to update user in Pomelo. Reason: ${JSON.stringify(e)}`);
      if (e.response.status === HttpStatus.NOT_FOUND) {
        throw new ServiceException({
          message: "User not found in Pomelo",
          errorCode: ServiceErrorCode.DOES_NOT_EXIST,
        });
      }
      throw new ServiceException({
        message: "Failed to update user in Pomelo",
        errorCode: ServiceErrorCode.UNKNOWN,
      });
    }
  }

  public async createCard(idempotencyKey: string, request: CreateCardRequest): Promise<PomeloCard> {
    const url = `${this.pomeloConfigs.apiBaseUrl}/cards/v1`;

    const body = {
      user_id: request.userID,
      affinity_group_id: this.pomeloConfigs.affinityGroup,
      card_type: request.cardType,
      ...(request.address && {
        address: {
          street_name: request.address.streetName,
          street_number: request.address.streetNumber,
          floor: request.address.floor,
          apartment: request.address.apartment,
          city: request.address.city,
          region: request.address.region,
          country: request.address.country,
          zip_code: request.address.zipCode,
          neighborhood: request.address.neighborhood,
        },
      }),
      ...(request.previousCardID && { previous_card_id: request.previousCardID }),
    };

    const accessToken = await this.getAccessToken();

    try {
      const { data } = await axios.post(url, body, {
        headers: {
          "Content-Type": "application/json; charset=utf-8",
          Authorization: `Bearer ${accessToken}`,
          "x-idempotency-key": idempotencyKey,
        },
      });

      return {
        id: data.data.id,
        cardType: data.data.card_type,
        productType: data.data.product_type,
        status: data.data.status,
        shipmentID: data.data.shipment_id,
        userID: data.data.user_id,
        startDate: data.data.start_date,
        lastFour: data.data.last_four,
        provider: data.data.provider,
      };
    } catch (e) {
      this.logger.error(`Failed to create card in Pomelo. Reason: ${JSON.stringify(e)}`);
      throw new ServiceException({
        message: "Failed to create card in Pomelo",
        errorCode: ServiceErrorCode.UNKNOWN,
      });
    }
  }

  public async getCard(id: string): Promise<PomeloCard> {
    const url = `${this.pomeloConfigs.apiBaseUrl}/cards/v1/${id}`;

    const accessToken = await this.getAccessToken();

    try {
      const { data } = await axios.get(url, {
        headers: {
          "Content-Type": "application/json; charset=utf-8",
          Authorization: `Bearer ${accessToken}`,
        },
      });

      return {
        id: data.data.id,
        cardType: data.data.card_type,
        productType: data.data.product_type,
        status: data.data.status,
        shipmentID: data.data.shipment_id,
        userID: data.data.user_id,
        startDate: data.data.start_date,
        lastFour: data.data.last_four,
        provider: data.data.provider,
      };
    } catch (e) {
      this.logger.error(`Failed to get card from Pomelo. Reason: ${JSON.stringify(e)}`);
      if (e.response.status === HttpStatus.NOT_FOUND) {
        throw new ServiceException({
          message: "Card not found in Pomelo",
          errorCode: ServiceErrorCode.DOES_NOT_EXIST,
        });
      }
      throw new ServiceException({
        message: "Failed to get card from Pomelo",
        errorCode: ServiceErrorCode.UNKNOWN,
      });
    }
  }

  public async updateCard(id: string, request: UpdateCardRequest): Promise<void> {
    const url = `${this.pomeloConfigs.apiBaseUrl}/cards/v1/${id}`;

    const body = {
      ...(request.status && { status: request.status }),
      ...(request.statusReason && { status_reason: request.statusReason }),
      ...(request.pin && { pin: request.pin }),
    };

    const accessToken = await this.getAccessToken();

    try {
      await axios.patch(url, body, {
        headers: {
          "Content-Type": "application/json; charset=utf-8",
          Authorization: `Bearer ${accessToken}`,
        },
      });
    } catch (e) {
      this.logger.error(`Failed to update card in Pomelo. Reason: ${JSON.stringify(e)}`);
      throw new ServiceException({
        message: "Failed to update card in Pomelo",
        errorCode: ServiceErrorCode.UNKNOWN,
      });
    }
  }
}
