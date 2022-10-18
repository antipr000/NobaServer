import { Inject, Injectable, InternalServerErrorException } from "@nestjs/common";
import { CustomConfigService } from "../../core/utils/AppConfigModule";
import { GenerateLinkTokenRequest } from "./domain/PlaidTypes";
import {
  Configuration as PlaidConfiguration,
  PlaidApi,
  PlaidEnvironments,
  LinkTokenCreateRequest as PlaidLinkTokenCreateRequest,
  LinkTokenCreateResponse as PlaidLinkTokenCreateResponse,
  CountryCode as PlaidCountryCode,
  Products as PlaidProducts,
} from "plaid";
import { AxiosResponse } from "axios";
import { WINSTON_MODULE_PROVIDER } from "nest-winston";
import { Logger } from "winston";
import { PlaidConfigs } from "../../config/configtypes/PlaidConfigs";
import { PLAID_CONFIG_KEY } from "../../config/ConfigurationUtils";

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
}

// 'client is not authorized to access the following products: ["transfer"]'
