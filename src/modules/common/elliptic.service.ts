import { BadRequestException, Inject, Injectable } from "@nestjs/common";
import axios, { AxiosResponse } from "axios";
import { createHmac } from "crypto";
import { WINSTON_MODULE_PROVIDER } from "nest-winston";
import { Logger } from "winston";
import { EllipticConfigs } from "../../config/configtypes/EllipticConfig";
import { ELLIPTIC_CONFIG_KEY } from "../../config/ConfigurationUtils";
import { CustomConfigService } from "../../core/utils/AppConfigModule";
import { Transaction } from "../transactions/domain/Transaction";
import {
  ellipticSupportedCurrencies,
  ellipticSupportedCurrenciesWithOutputType,
  EllipticTransactionAnalysisRequest,
  EllipticTransactionAnalysisResponse,
} from "./domain/EllipticTransactionAnalysisTypes";
import { WalletExposureResponse } from "./domain/WalletExposureResponse";

@Injectable()
export class EllipticService {
  @Inject(WINSTON_MODULE_PROVIDER) private readonly logger: Logger;

  private apiKey: string;
  private secretKey: string;
  private baseUrl: string;
  private awsSecretNameForApiKey: string;

  constructor(private readonly configService: CustomConfigService) {
    this.apiKey = this.configService.get<EllipticConfigs>(ELLIPTIC_CONFIG_KEY).apiKey;
    this.awsSecretNameForApiKey = this.configService.get<EllipticConfigs>(ELLIPTIC_CONFIG_KEY).awsSecretNameForApiKey;
    this.secretKey = this.configService.get<EllipticConfigs>(ELLIPTIC_CONFIG_KEY).secretKey;
    this.baseUrl = this.configService.get<EllipticConfigs>(ELLIPTIC_CONFIG_KEY).baseUrl;
  }

  private async makeRequest(requestMethod: string, requestPath: string, requestBody: any): Promise<AxiosResponse<any>> {
    const url = `${this.baseUrl}${requestPath}`;
    const timestamp = Date.now(); // Same as new Date().getTime() but makes mocking easier

    const signaturePlainText = `${timestamp}${requestMethod}${requestPath}${JSON.stringify(requestBody)}`;

    const signature = createHmac("sha256", Buffer.from(this.secretKey, "base64"))
      .update(signaturePlainText)
      .digest("base64");

    if (requestMethod === "POST") {
      try {
        const response = await axios.post(url, requestBody, {
          headers: {
            "x-access-key": this.apiKey,
            "x-access-sign": signature,
            "x-access-timestamp": timestamp,
          },
        });
        return response;
      } catch (e) {
        this.logger.error(
          `Error with Elliptic ${requestMethod} ${requestPath} API call with payload ${JSON.stringify(
            requestBody,
          )}. ${JSON.stringify(e)}`,
        );
        throw e;
      }
    } else {
      throw new Error(`${requestMethod} is not valid for calling Elliptic.`);
    }
  }

  public async transactionAnalysis(transaction: Transaction): Promise<WalletExposureResponse> {
    const assetType: string = transaction.props.leg2.toUpperCase();
    if (
      ["PROD_ELLIPTIC_KEY", "E2E_KEY"].includes(this.awsSecretNameForApiKey) ||
      !ellipticSupportedCurrencies.includes(assetType)
    ) {
      return {
        // Return -1 risk for non-prod runs for elliptic as elliptic doesn't run on testnet.
        riskScore: -1,
      };
    }
    let output_params = {};
    if (ellipticSupportedCurrenciesWithOutputType.includes(assetType)) {
      output_params = {
        output_type: "address",
        output_address: transaction.props.destinationWalletAddress,
      };
    }

    const requestBody: EllipticTransactionAnalysisRequest = {
      subject: {
        asset: assetType,
        type: "transaction",
        hash: transaction.props.blockchainTransactionId,
        ...output_params,
      },
      type: "destination_of_funds",
      customer_reference: transaction.props.userId,
    };

    try {
      const { data }: { data: EllipticTransactionAnalysisResponse } = await this.makeRequest(
        "POST",
        "/v2/analyses/synchronous",
        requestBody,
      );
      return {
        riskScore: data.risk_score,
      };
    } catch (e) {
      this.logger.error(`Request to elliptic failed: Error: ${JSON.stringify(e)}`);
      throw new BadRequestException(e.message);
    }
  }
}
