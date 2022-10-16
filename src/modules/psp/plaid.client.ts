import { Inject, Injectable, InternalServerErrorException } from "@nestjs/common";
import { CustomConfigService } from "../../core/utils/AppConfigModule";
import { GenerateLinkTokenRequest } from "./domain/PlaidTypes";
import {
  Configuration as PlaidConfiguration,
  PlaidApi,
  PlaidEnvironments,
  LinkTokenCreateRequest as PlaidLinkTokenCreateRequest,
  LinkTokenCreateResponse as PlaidLinkTokenCreateResponse,
  LinkTokenCreateRequest,
  CountryCode as PlaidCountryCode,
  Products as PlaidProducts,
} from "plaid";
import { AxiosResponse } from "axios";
import { WINSTON_MODULE_PROVIDER } from "nest-winston";
import { Logger } from "winston";

@Injectable()
export class PlaidClient {
  private plaidApi: PlaidApi;

  constructor(
    private readonly configService: CustomConfigService,
    @Inject(WINSTON_MODULE_PROVIDER) private readonly logger: Logger,
  ) {
    const plaidConfiguration: PlaidConfiguration = new PlaidConfiguration({
      basePath: PlaidEnvironments["sandbox"],
      baseOptions: {
        headers: {
          "PLAID-CLIENT-ID": "62432d096685bc0013d030a8",
          "PLAID-SECRET": "___",
          "Plaid-Version": "2020-09-14",
        },
      },
    });
    this.plaidApi = new PlaidApi(plaidConfiguration);
  }

  public async generateLinkToken(request: GenerateLinkTokenRequest): Promise<string> {
    try {
      const createLinkRequest: LinkTokenCreateRequest = {
        user: {
          client_user_id: request.userID,
        },
        client_name: "Noba", // Should come from partner configs.
        products: [PlaidProducts.Auth],
        country_codes: [PlaidCountryCode.Us],
        language: "en",
        redirect_uri: "http://localhost:8080/plaid/redirect_uri", // TODO: Fill this based on the frontend
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
