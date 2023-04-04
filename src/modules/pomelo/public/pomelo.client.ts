import { HttpStatus, Inject, Injectable } from "@nestjs/common";
import { CustomConfigService } from "../../../core/utils/AppConfigModule";
import { WINSTON_MODULE_PROVIDER } from "nest-winston";
import { Logger } from "winston";
import { PomeloConfigs } from "../../../config/configtypes/PomeloConfigs";
import { POMELO_CONFIG_KEY } from "../../../config/ConfigurationUtils";
import axios, { AxiosResponse, Method } from "axios";
import {
  ClientCreateCardRequest,
  ClientCreateUserRequest,
  ClientUpdateCardRequest,
  ClientUpdateUserRequest,
  ClientPomeloUser,
  ClientPomeloCard,
} from "../dto/pomelo.client.dto";
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

  private async makeAPICall(request: {
    method: Method;
    url: string;
    body?: any;
    queryParams?: any;
    accessToken?: string;
    idempotencyKey?: string;
  }): Promise<AxiosResponse> {
    return axios.request({
      method: request.method,
      url: request.url,
      headers: {
        "Content-Type": "application/json; charset=utf-8",
        ...(request.accessToken && {
          Authorization: `Bearer ${request.accessToken}`,
        }),
        ...(request.idempotencyKey && {
          "x-idempotency-key": request.idempotencyKey,
        }),
      },
      ...(request.body && {
        data: request.body,
      }),
      ...(request.queryParams && {
        params: request.queryParams,
      }),
    });
  }

  private async getAccessToken(): Promise<string> {
    const body = {
      client_id: this.pomeloConfigs.clientID,
      client_secret: this.pomeloConfigs.clientSecret,
      audience: this.pomeloConfigs.audience,
      grant_type: "client_credentials",
    };

    try {
      const { data } = await this.makeAPICall({
        method: "POST",
        url: `${this.pomeloConfigs.authBaseUrl}/oauth/token`,
        body: body,
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

  public async createUser(consumerID: string, request: ClientCreateUserRequest): Promise<ClientPomeloUser> {
    const accessToken = await this.getAccessToken();
    try {
      const { data } = await this.makeAPICall({
        method: "POST",
        body: request,
        url: `${this.pomeloConfigs.apiBaseUrl}/users/v1`,
        accessToken: accessToken,
        idempotencyKey: consumerID,
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

  public async getUser(id: string): Promise<ClientPomeloUser> {
    const accessToken = await this.getAccessToken();

    try {
      const { data } = await this.makeAPICall({
        method: "GET",
        url: `${this.pomeloConfigs.apiBaseUrl}/users/v1/${id}`,
        accessToken: accessToken,
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

  public async updateUser(id: string, request: ClientUpdateUserRequest): Promise<ClientPomeloUser> {
    const accessToken = await this.getAccessToken();

    try {
      const { data } = await this.makeAPICall({
        method: "PATCH",
        url: `${this.pomeloConfigs.apiBaseUrl}/users/v1/${id}`,
        body: request,
        accessToken: accessToken,
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

  public async createUserToken(userID: string): Promise<string> {
    const accessToken = await this.getAccessToken();
    try {
      const { data } = await this.makeAPICall({
        method: "POST",
        url: `${this.pomeloConfigs.apiBaseUrl}/secure-data/v1/token`,
        body: {
          user_id: userID,
        },
        accessToken: accessToken,
      });

      return data.access_token;
    } catch (e) {
      this.logger.error(`Failed to generate access token for user: ${userID}. Reason: ${JSON.stringify(e)}`);
      throw new ServiceException({
        errorCode: ServiceErrorCode.UNKNOWN,
        message: "Failed to fetch access token for user",
      });
    }
  }

  public async createCard(idempotencyKey: string, request: ClientCreateCardRequest): Promise<ClientPomeloCard> {
    const accessToken = await this.getAccessToken();

    try {
      const { data } = await this.makeAPICall({
        method: "POST",
        url: `${this.pomeloConfigs.apiBaseUrl}/cards/v1`,
        body: request,
        accessToken: accessToken,
        idempotencyKey: idempotencyKey,
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

  public async getCard(id: string): Promise<ClientPomeloCard> {
    const accessToken = await this.getAccessToken();

    try {
      const { data } = await this.makeAPICall({
        method: "GET",
        url: `${this.pomeloConfigs.apiBaseUrl}/cards/v1/${id}`,
        accessToken: accessToken,
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

  public async updateCard(id: string, request: ClientUpdateCardRequest): Promise<void> {
    const accessToken = await this.getAccessToken();

    try {
      await this.makeAPICall({
        method: "PATCH",
        url: `${this.pomeloConfigs.apiBaseUrl}/cards/v1/${id}`,
        accessToken: accessToken,
        body: request,
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
