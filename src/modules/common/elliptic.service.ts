import { BadRequestException, Inject, Injectable } from "@nestjs/common";
import { WINSTON_MODULE_PROVIDER } from "nest-winston";
import { CustomConfigService } from "../../core/utils/AppConfigModule";
import { Logger } from "winston";
import { EllipticConfigs } from "../../config/configtypes/EllipticConfig";
import { ELLIPTIC_CONFIG_KEY } from "../../config/ConfigurationUtils";
import axios, { AxiosResponse } from "axios";
import { WalletExposureResponse } from "./domain/WalletExposureResponse";
import { Transaction } from "../transactions/domain/Transaction";
import {
  EllipticTransactionAnalysisRequest,
  EllipticTransactionAnalysisResponse,
} from "./domain/EllipticTransactionAnalysisTypes";

@Injectable()
export class EllipticService {
  @Inject(WINSTON_MODULE_PROVIDER) private readonly logger: Logger;

  private apiKey: string;
  private baseUrl: string;

  constructor(private readonly configService: CustomConfigService) {
    this.apiKey = this.configService.get<EllipticConfigs>(ELLIPTIC_CONFIG_KEY).apiKey;
    this.baseUrl = this.configService.get<EllipticConfigs>(ELLIPTIC_CONFIG_KEY).baseUrl;
  }

  private async makeRequest(requestMethod: string, requestPath: string, requestBody: any): Promise<AxiosResponse<any>> {
    const url = `${this.baseUrl}${requestPath}`;

    const timestamp = Date.now(); // Same as new Date().getTime() but makes mocking easier

    const signature = `${timestamp}${requestMethod}${requestPath}${JSON.stringify(requestBody)}`;

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
      throw new Error("Not supported!");
    }
  }

  public async transactionAnalysis(transaction: Transaction): Promise<WalletExposureResponse> {
    const requestBody: EllipticTransactionAnalysisRequest = {
      subject: {
        asset: transaction.props.leg2,
        blockchain: "",
        type: "transaction",
        hash: transaction.props.blockchainTransactionId,
        output_type: "address",
        output_address: transaction.props.destinationWalletAddress,
      },
      type: "destination_of_funds",
      customer_reference: transaction.props.userId,
    };

    try {
      const { data }: { data: EllipticTransactionAnalysisResponse } = await this.makeRequest(
        "POST",
        "/analyses/synchronous",
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
