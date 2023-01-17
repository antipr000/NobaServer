import { Inject, Injectable } from "@nestjs/common";
import { WINSTON_MODULE_PROVIDER } from "nest-winston";
import { MonoConfigs } from "../../../config/configtypes/MonoConfig";
import { MONO_CONFIG_KEY } from "../../../config/ConfigurationUtils";
import { CustomConfigService } from "../../../core/utils/AppConfigModule";
import { Logger } from "winston";
import { MonoClientCollectionLinkRequest, MonoClientCollectionLinkResponse } from "../dto/mono.client.dto";
import axios from "axios";
import { fromString as convertToUUIDv4 } from "uuidv4";
import { InternalServiceErrorException } from "../../../core/exception/CommonAppException";
import { Utils } from "../../../core/utils/Utils";

@Injectable()
export class MonoClient {
  private readonly apiVersion = "v1";
  private readonly expiryTimeInMillis = 15 * 60 * 1000; // 15 minutes

  private bearerToken: string;
  private baseUrl: string;
  private nobaAccountID: string;

  constructor(configService: CustomConfigService, @Inject(WINSTON_MODULE_PROVIDER) private readonly logger: Logger) {
    const monoConfigs: MonoConfigs = configService.get<MonoConfigs>(MONO_CONFIG_KEY);
    this.bearerToken = monoConfigs.bearerToken;
    this.baseUrl = monoConfigs.baseURL;
    this.nobaAccountID = monoConfigs.nobaAccountID;
  }

  private getAuthorizationHeader(): Record<string, string> {
    return {
      Authorization: `Bearer ${this.bearerToken}`,
    };
  }

  private getIdempotentHeader(idempotencyKeySeed: string): Record<string, string> {
    return {
      "x-idempotency-key": convertToUUIDv4(idempotencyKeySeed),
    };
  }

  async createCollectionLink(request: MonoClientCollectionLinkRequest): Promise<MonoClientCollectionLinkResponse> {
    const url = `${this.baseUrl}/${this.apiVersion}/collection_links`;
    const headers = {
      ...this.getAuthorizationHeader(),
      ...this.getIdempotentHeader(request.transactionID),
    };

    const requestBody = {
      account_id: this.nobaAccountID,
      amount: {
        // Amount is represented in cents (i.e. multiply by 100). Then use Utils method to be extra sure no decimals are sent.
        amount: Utils.roundToSpecifiedDecimalNumber(request.amount * 100, 0),
        currency: request.currency,
      },
      amount_validation: "fixed",
      expires_at: new Date(Date.now() + this.expiryTimeInMillis).toISOString(),
      external_id: request.transactionID,
      payer: {
        document_number: "",
        document_type: "CC",
        email: request.consumerEmail,
        name: request.consumerName,
        note: {
          editable: true,
          required: false,
          value: "",
        },
        phone: "+573000000000", //request.consumerPhone, TODO: Mono has issues with phone numbers and this is the only one that works right now
      },
      redirect_url: "https://www.noba.com/",
      reference: {
        editable: false,
        required: false,
        value: "",
      },
      usage_type: "single_use",
    };

    try {
      const response = await axios.post(url, requestBody, { headers });
      return {
        collectionLink: response.data.link,
        collectionLinkID: response.data.id,
      };
    } catch (err) {
      this.logger.error(`Error while creating collection link: ${JSON.stringify(err)}`);
      throw new InternalServiceErrorException({ message: "Error while creating Mono collection link" });
    }
  }
}
