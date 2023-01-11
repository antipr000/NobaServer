import { Inject, Injectable } from "@nestjs/common";
import { WINSTON_MODULE_PROVIDER } from "nest-winston";
import { MonoConfigs } from "src/config/configtypes/MonoConfig";
import { MONO_CONFIG_KEY } from "src/config/ConfigurationUtils";
import { CustomConfigService } from "src/core/utils/AppConfigModule";
import { Logger } from "winston";
import { CollectionLinkRequest } from "../dto/mono.client.dto";
import axios from 'axios';
import { fromString as convertToUUIDv4 } from "uuidv4";
import { InternalServiceErrorException } from "src/core/exception/CommonAppException";

@Injectable()
export class MonoClient {
  private readonly apiVersion = "v1";
  private readonly expiryTimeInMillis = 10 * 60 * 1000; // 10 minutes

  private bearerToken: string;
  private baseUrl: string;
  private nobaAccountId: string;

  constructor(configService: CustomConfigService, @Inject(WINSTON_MODULE_PROVIDER) private readonly logger: Logger) {
    const monoConfigs: MonoConfigs = configService.get<MonoConfigs>(MONO_CONFIG_KEY);
    this.bearerToken = monoConfigs.bearerToken;
    this.baseUrl = monoConfigs.baseUrl;
    this.nobaAccountId = monoConfigs.nobaAccountId;
  }

  private getAuthorizationHeader(): Record<string, string> {
    return {
      Authorization: `Bearer ${this.bearerToken}`,
    };
  }

  private getIdempotentHeader(idempotencyKeySeed: string): Record<string, string> {
    return {
      'x-idempotency-key': convertToUUIDv4(idempotencyKeySeed),
    };
  }

  async createCollectionLink(request: CollectionLinkRequest): Promise<string> {
    const url = `${this.baseUrl}/${this.apiVersion}/collection_links`;
    const headers = {
      ... this.getAuthorizationHeader(),
      ... this.getIdempotentHeader(request.transactionID),
    };

    const requestBody = {
      account_id: this.nobaAccountId,
      amount: {
        amount: request.amount,
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
        phone: request.consumerPhone,
      },
      redirect_url: "https://www.noba.com/",
      reference: {
        editable: false,
        required: false,
        value: "",
      },
      usage_type: "single_use"
    };

    try {
      const response = await axios.post(url, requestBody, { headers });
      return response.data.link;
    } catch (err) {
      this.logger.error(`Error while creating collection link: ${JSON.stringify(err)}`);
      throw new InternalServiceErrorException({ message: "Error while creating Mono collection link" });
    }
  }
};
