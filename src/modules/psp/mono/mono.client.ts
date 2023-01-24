import { Inject, Injectable } from "@nestjs/common";
import { WINSTON_MODULE_PROVIDER } from "nest-winston";
import { MonoConfigs } from "../../../config/configtypes/MonoConfig";
import { MONO_CONFIG_KEY } from "../../../config/ConfigurationUtils";
import { CustomConfigService } from "../../../core/utils/AppConfigModule";
import { Logger } from "winston";
import {
  MonoClientCollectionLinkRequest,
  MonoClientCollectionLinkResponse,
  MonoWithdrawalRequest,
  MonoWithdrawalResponse,
} from "../dto/mono.client.dto";
import axios from "axios";
import { fromString as convertToUUIDv4 } from "uuidv4";
import { InternalServiceErrorException } from "../../../core/exception/CommonAppException";
import { Utils } from "../../../core/utils/Utils";
import { ServiceErrorCode, ServiceException } from "../../../core/exception/ServiceException";
import { SupportedBanksDTO } from "../dto/SupportedBanksDTO";

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

  async getSupportedBanks(): Promise<Array<SupportedBanksDTO>> {
    const url = `${this.baseUrl}/${this.apiVersion}/banks`;
    const headers = {
      ...this.getAuthorizationHeader(),
    };

    try {
      const { data } = await axios.get(url, { headers });
      return data["banks"];
    } catch (e) {
      this.logger.error(`Failed to fetch bank list from mono. ${JSON.stringify(e)}`);
      throw new ServiceException({
        errorCode: ServiceErrorCode.UNABLE_TO_PROCESS,
        message: "Failed to fetch data from Mono",
      });
    }
  }

  async createCollectionLink(request: MonoClientCollectionLinkRequest): Promise<MonoClientCollectionLinkResponse> {
    const url = `${this.baseUrl}/${this.apiVersion}/collection_links`;
    const headers = {
      ...this.getAuthorizationHeader(),
      ...this.getIdempotentHeader(request.transactionID),
    };

    // Mono can only accept phone numbers in the format +57XXXXXXXXX and it is a required field, so we need to make sure we send a valid one.
    // This is really only a problem with testing, as in practice our customers should have +57 phone numbers.
    const phone = request.consumerPhone.startsWith("+57") ? request.consumerPhone : "+573000000000";

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
        phone: phone,
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
      this.logger.error(
        `Error while creating collection link: ${JSON.stringify(err)}. Request body: ${JSON.stringify(requestBody)}`,
      );
      throw new ServiceException({
        errorCode: ServiceErrorCode.UNKNOWN,
        message: "Error while creating Mono collection link",
      });
    }
  }

  // Only allow single transfer for now
  async transfer(request: MonoWithdrawalRequest): Promise<MonoWithdrawalResponse> {
    const url = `${this.baseUrl}/${this.apiVersion}/transfers`;
    const headers = {
      ...this.getAuthorizationHeader(),
      ...this.getIdempotentHeader(request.transactionID),
    };

    const requestBody = {
      account_id: this.nobaAccountID,
      transfers: [
        {
          amount: {
            // Amount is represented in cents (i.e. multiply by 100). Then use Utils method to be extra sure no decimals are sent.
            amount: Utils.roundToSpecifiedDecimalNumber(request.amount * 100, 0),
            currency: request.currency,
          },
          entity_id: request.transactionID, // Same as idempotency key
          payee: {
            bank_account: {
              bank_code: request.bankAccountCode,
              number: request.bankAccountNumber,
              type: request.bankAccountType,
            },
            name: request.consumerName,
            email: request.consumerEmail,
            document_number: request.documentNumber,
            document_type: request.documentType,
          },
          reference: request.transactionRef,
        },
      ],
    };

    try {
      const response = await axios.post(url, requestBody, { headers });
      if (response.status === 200) {
        this.logger.error(
          `Mono transfer was successful but found duplicate transaction ID:${
            request.transactionID
          }. Request body: ${JSON.stringify(requestBody)}`,
        );
      }

      const transferResponse = response.data.transfers[0]; // Should only be one transfer

      return {
        withdrawalID: transferResponse.batch.id,
        state: transferResponse.batch.state, // There are many states, should we check against them?
        declinationReason: transferResponse.declination_reason,
      };
    } catch (err) {
      this.logger.error(
        `Error while transferring funds from Mono: ${JSON.stringify(err)}. Request body: ${JSON.stringify(
          requestBody,
        )}`,
      );
      throw new ServiceException({
        errorCode: ServiceErrorCode.UNKNOWN,
        message: "Error while transferring funds from Mono",
      });
    }
  }
}
