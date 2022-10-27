import { Inject, Injectable, InternalServerErrorException } from "@nestjs/common";
import {
  Configuration as PlaidConfiguration,
  PlaidApi,
  PlaidEnvironments,
  LinkTokenCreateRequest as PlaidLinkTokenCreateRequest,
  LinkTokenCreateResponse as PlaidLinkTokenCreateResponse,
  CountryCode as PlaidCountryCode,
  Products as PlaidProducts,
  ItemPublicTokenExchangeResponse,
  AuthGetResponse,
  ProcessorTokenCreateRequestProcessorEnum,
  ProcessorTokenCreateResponse,
} from "plaid";
import { AxiosResponse } from "axios";
import { WINSTON_MODULE_PROVIDER } from "nest-winston";
import { Logger } from "winston";
import { CustomConfigService } from "../../core/utils/AppConfigModule";
import { PlaidConfigs } from "../../config/configtypes/PlaidConfigs";
import { PLAID_CONFIG_KEY } from "../../config/ConfigurationUtils";
import {
  CreateProcessorTokenRequest,
  ExchangeForAccessTokenRequest,
  GenerateLinkTokenRequest,
  RetrieveAuthDataRequest,
  RetrieveAuthDataResponse,
  TokenProcessor,
} from "./domain/PlaidTypes";

@Injectable()
export class PlaidClient {
  private plaidApi: PlaidApi;
  private plaidConfigs: PlaidConfigs;

  constructor(configService: CustomConfigService, @Inject(WINSTON_MODULE_PROVIDER) private readonly logger: Logger) {
    this.plaidConfigs = configService.get<PlaidConfigs>(PLAID_CONFIG_KEY);

    const plaidConfiguration: PlaidConfiguration = new PlaidConfiguration({
      basePath: PlaidEnvironments[this.plaidConfigs.env],
      baseOptions: {
        headers: {
          "PLAID-CLIENT-ID": this.plaidConfigs.clientID,
          "PLAID-SECRET": this.plaidConfigs.secretKey,
          "Plaid-Version": this.plaidConfigs.version,
        },
      },
    });
    this.plaidApi = new PlaidApi(plaidConfiguration);
  }

  public async generateLinkToken(request: GenerateLinkTokenRequest): Promise<string> {
    try {
      const createLinkRequest: PlaidLinkTokenCreateRequest = {
        user: {
          client_user_id: request.userID,
        },
        client_name: "Noba", // Should come from partner configs.
        products: [PlaidProducts.Auth],
        country_codes: [PlaidCountryCode.Us],
        language: "en",
        redirect_uri: this.plaidConfigs.redirectUri,
      };

      const createTokenResponse: AxiosResponse<PlaidLinkTokenCreateResponse> = await this.plaidApi.linkTokenCreate(
        createLinkRequest,
      );

      if (createTokenResponse.status !== 200) {
        this.logger.error(`Error creating link token: ${JSON.stringify(createTokenResponse)}`);
        throw new InternalServerErrorException("Service unavailable. Please try again.");
      }

      return createTokenResponse.data.link_token;
    } catch (err) {
      this.logger.error(`Error while creating link token: ${JSON.stringify(err.response.data)}`);
      throw new InternalServerErrorException("Service unavailable. Please try again.");
    }
  }

  public async exchangeForAccessToken(request: ExchangeForAccessTokenRequest): Promise<string> {
    try {
      const tokenResponse: AxiosResponse<ItemPublicTokenExchangeResponse> = await this.plaidApi.itemPublicTokenExchange(
        {
          public_token: request.publicToken,
        },
      );

      this.logger.info(`"itemPublicTokenExchange" succeeds with request_id: "${tokenResponse.data.request_id}"`);

      return tokenResponse.data.access_token;
    } catch (err) {
      this.logger.error(`Error while exchanging public token: ${JSON.stringify(err.response.data)}`);
      throw new InternalServerErrorException("Failed to authorize. Please try again.");
    }
  }

  // TODO: Consider moving this to an asynchronous flow because as per Plaid documentation -
  // "This request may take some time because Plaid must communicate directly with the
  //  institution to retrieve the data."
  public async retrieveAuthData(request: RetrieveAuthDataRequest): Promise<RetrieveAuthDataResponse> {
    try {
      const authData: AxiosResponse<AuthGetResponse> = await this.plaidApi.authGet({
        access_token: request.accessToken,
      });
      this.logger.info(`"authGet" succeeds with request_id: "${authData.data.request_id}"`);

      if (authData.data.accounts.length === 0) {
        this.logger.error(`Empty account list from Plaid API.`);
        throw new InternalServerErrorException("Failed to authorize. Please try again in some time.");
      }

      return {
        accountID: authData.data.accounts[0].account_id,
        itemID: authData.data.item.item_id,
      };
    } catch (err) {
      this.logger.error(`Error while fetching auth data: ${JSON.stringify(err.response.data)}`);
      throw new InternalServerErrorException("Failed to authorize. Please try again in some time.");
    }
  }

  public async createProcessorToken(request: CreateProcessorTokenRequest): Promise<string> {
    try {
      let tokenProcessor: ProcessorTokenCreateRequestProcessorEnum;
      switch (request.tokenProcessor) {
        case TokenProcessor.CHECKOUT:
          tokenProcessor = ProcessorTokenCreateRequestProcessorEnum.Checkout;
          break;

        default:
          this.logger.error(`Invalid token processor: "${request.tokenProcessor}".`);
          throw new InternalServerErrorException("Internal server error.");
      }

      const processorTokenResponse: AxiosResponse<ProcessorTokenCreateResponse> =
        await this.plaidApi.processorTokenCreate({
          access_token: request.accessToken,
          account_id: request.accountID,
          processor: tokenProcessor,
        });
      this.logger.info(`"processorTokenCreate" succeeds with request_id: "${processorTokenResponse.data.request_id}"`);

      console.log(processorTokenResponse);
      return processorTokenResponse.data.processor_token;
    } catch (err) {
      this.logger.error(`Error while creating processor token: ${JSON.stringify(err.response.data)}`);
      throw new InternalServerErrorException("Failed to authorize. Please try again in some time.");
    }
  }
}
