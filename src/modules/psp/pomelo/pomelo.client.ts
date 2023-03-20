import { HttpStatus, Inject, Injectable } from "@nestjs/common";
import { CustomConfigService } from "../../../core/utils/AppConfigModule";
import { WINSTON_MODULE_PROVIDER } from "nest-winston";
import { Logger } from "winston";
import { PomeloConfigs } from "../../../config/configtypes/PomeloConfigs";
import { POMELO_CONFIG_KEY } from "../../../config/ConfigurationUtils";
import axios from "axios";
import { CreateCardRequest, CreateUserRequest, UpdateCardRequest, UpdateUserRequest } from "./dto/pomelo.client.dto";

import { PomeloCard } from "./domain/PomeloCard";
import { PomeloUser } from "./domain/PomeloUser";
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

  public async createUser(consumerID: string, request: CreateUserRequest): Promise<PomeloUser> {
    const url = `${this.pomeloConfigs.apiBaseUrl}/users/v1`;

    const accessToken = await this.getAccessToken();

    try {
      const { data } = await axios.post(url, request, {
        headers: {
          "Content-Type": "application/json; charset=utf-8",
          Authorization: `Bearer ${accessToken}`,
          "x-idempotency-key": consumerID,
        },
      });

      return {
        id: data.data.id,
        status: data.data.status,
      };
    } catch (e) {
      this.logger.error(`Failed to create user in Pomelo. Reason: ${JSON.stringify(e)}`);
      throw new ServiceException({
        message: "Failed to create user in Pomelo",
        errorCode: ServiceErrorCode.UNKNOWN,
      });
    }
  }

  public async getUser(id: string): Promise<PomeloUser> {
    const url = `${this.pomeloConfigs.apiBaseUrl}/users/v1/${id}`;

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
        status: data.data.status,
      };
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

  public async updateUser(id: string, request: UpdateUserRequest): Promise<PomeloUser> {
    const url = `${this.pomeloConfigs.apiBaseUrl}/users/v1/${id}`;

    const accessToken = await this.getAccessToken();

    try {
      const { data } = await axios.patch(url, request, {
        headers: {
          "Content-Type": "application/json; charset=utf-8",
          Authorization: `Bearer ${accessToken}`,
        },
      });

      return {
        id: data.data.id,
        status: data.data.status,
      };
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

    const accessToken = await this.getAccessToken();

    try {
      const { data } = await axios.post(url, request, {
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

    const accessToken = await this.getAccessToken();

    try {
      await axios.patch(url, request, {
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
