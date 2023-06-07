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
  DepositoryAccountSubtype,
  AccountSubtype,
} from "plaid";
import { AxiosResponse } from "axios";
import { WINSTON_MODULE_PROVIDER } from "nest-winston";
import { Logger } from "winston";
import { CustomConfigService } from "../../core/utils/AppConfigModule";
import { PlaidConfigs } from "../../config/configtypes/PlaidConfigs";
import { PLAID_CONFIG_KEY } from "../../config/ConfigurationUtils";
import {
  BankAccountType,
  CreateProcessorTokenRequest,
  ExchangeForAccessTokenRequest,
  GenerateLinkTokenRequest,
  RetrieveAccountDataRequest,
  RetrieveAccountDataResponse,
  TokenProcessor,
} from "./domain/PlaidTypes";
import { Utils } from "../../core/utils/Utils";
import { IClient } from "../../core/domain/IClient";
import { HealthCheckResponse, HealthCheckStatus } from "../../core/domain/HealthCheckTypes";
import { AlertService } from "../common/alerts/alert.service";

@Injectable()
export class PlaidClient implements IClient {
  @Inject()
  private readonly alertService: AlertService;

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

  async getHealth(): Promise<HealthCheckResponse> {
    return {
      status: HealthCheckStatus.UNAVAILABLE,
    };
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
        account_filters: {
          depository: {
            account_subtypes: [DepositoryAccountSubtype.Checking, DepositoryAccountSubtype.Savings],
          },
        },
        redirect_uri: this.plaidConfigs.redirectUri,
      };

      const createTokenResponse: AxiosResponse<PlaidLinkTokenCreateResponse> = await this.plaidApi.linkTokenCreate(
        createLinkRequest,
      );

      if (createTokenResponse.status !== 200) {
        this.alertService.raiseError(`Error creating link token: ${JSON.stringify(createTokenResponse)}`);
        throw new InternalServerErrorException("Service unavailable. Please try again.");
      }

      return createTokenResponse.data.link_token;
    } catch (err) {
      this.alertService.raiseError(`Error while creating link token: ${JSON.stringify(err.response.data)}`);
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
      this.alertService.raiseError(`Error while exchanging public token: ${JSON.stringify(err.response.data)}`);
      throw new InternalServerErrorException("Failed to authorize. Please try again.");
    }
  }

  // TODO: Consider moving this to an asynchronous flow because as per Plaid documentation -
  // "This request may take some time because Plaid must communicate directly with the
  //  institution to retrieve the data."
  public async retrieveAccountData(request: RetrieveAccountDataRequest): Promise<RetrieveAccountDataResponse> {
    try {
      const authData: AxiosResponse<AuthGetResponse> = await this.plaidApi.authGet({
        access_token: request.accessToken,
      });

      if (authData == null) {
        const errorMessage = `authGet call returned null for token ${request.accessToken}`;
        this.alertService.raiseError(errorMessage);
        throw new InternalServerErrorException(errorMessage);
      }

      if (authData.data.accounts.length != 1) {
        const errorMessage = "Mismatch between access token and account id in Plaid AuthGet request.";
        this.alertService.raiseError(errorMessage);
        throw new InternalServerErrorException(errorMessage);
      }

      let type: BankAccountType;
      switch (authData.data.accounts[0].subtype) {
        case AccountSubtype.Checking:
          type = BankAccountType.CHECKING;
          break;

        case AccountSubtype.Savings:
          type = BankAccountType.SAVINGS;
          break;

        default:
          type = BankAccountType.OTHERS;
      }

      return {
        accountID: authData.data.accounts[0].account_id,
        itemID: authData.data.item.item_id,
        institutionID: authData.data.item.institution_id,
        availableBalance: Utils.roundTo2DecimalString(authData.data.accounts[0].balances.available / 100),
        currencyCode: authData.data.accounts[0].balances.iso_currency_code,
        mask: authData.data.accounts[0].mask,
        name: authData.data.accounts[0].name,
        accountType: type,
        accountNumber: authData.data.numbers.ach[0].account,
        achRoutingNumber: authData.data.numbers.ach[0].routing,
        wireRoutingNumber: authData.data.numbers.ach[0].wire_routing,
      };
    } catch (err) {
      this.alertService.raiseError(`Error while fetching auth data: ${err}`);
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
          this.alertService.raiseError(`Invalid token processor: "${request.tokenProcessor}".`);
          throw new InternalServerErrorException("Internal server error.");
      }

      const processorTokenResponse: AxiosResponse<ProcessorTokenCreateResponse> =
        await this.plaidApi.processorTokenCreate({
          access_token: request.accessToken,
          account_id: request.accountID,
          processor: tokenProcessor,
        });
      this.logger.info(
        `"processorTokenCreate" succeeds with request_id: "${processorTokenResponse.data.request_id}" and token ${processorTokenResponse.data.processor_token}`,
      );

      return processorTokenResponse.data.processor_token;
    } catch (err) {
      this.alertService.raiseError(`Error while creating processor token: ${JSON.stringify(err.response.data)}`);
      throw new InternalServerErrorException("Failed to authorize. Please try again in some time.");
    }
  }
}
