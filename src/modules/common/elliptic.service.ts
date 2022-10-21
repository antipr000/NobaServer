import { BadRequestException, Inject, Injectable } from "@nestjs/common";
import axios, { AxiosResponse } from "axios";
import { createHmac } from "crypto";
import { WINSTON_MODULE_PROVIDER } from "nest-winston";
import { Logger } from "winston";
import { EllipticConfigs } from "../../config/configtypes/EllipticConfig";
import { ELLIPTIC_CONFIG_KEY, isProductionEnvironment } from "../../config/ConfigurationUtils";
import { CustomConfigService } from "../../core/utils/AppConfigModule";
import { Transaction } from "../transactions/domain/Transaction";
import { CHAINTYPE_ERC20, CurrencyService } from "./currency.service";
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

  constructor(private readonly configService: CustomConfigService, private readonly currencyService: CurrencyService) {
    this.apiKey = this.configService.get<EllipticConfigs>(ELLIPTIC_CONFIG_KEY).apiKey;
    this.secretKey = this.configService.get<EllipticConfigs>(ELLIPTIC_CONFIG_KEY).secretKey;
    this.baseUrl = this.configService.get<EllipticConfigs>(ELLIPTIC_CONFIG_KEY).baseUrl;
  }

  private async makeRequest(requestPath: string, requestBody: any): Promise<AxiosResponse<any>> {
    const url = `${this.baseUrl}${requestPath}`;
    const timestamp = Date.now(); // Same as new Date().getTime() but makes mocking easier

    const signaturePlainText = `${timestamp}POST${requestPath}${JSON.stringify(requestBody)}`;

    const signature = createHmac("sha256", Buffer.from(this.secretKey, "base64"))
      .update(signaturePlainText)
      .digest("base64");

    const headers = {
      headers: {
        "x-access-key": this.apiKey,
        "x-access-sign": signature,
        "x-access-timestamp": timestamp,
      },
    };

    try {
      const response = await axios.post(url, requestBody, headers);
      return response;
    } catch (e) {
      this.logger.error(
        `Error with Elliptic POST ${requestPath} API call with payload ${JSON.stringify(requestBody)}. ${JSON.stringify(
          e,
        )}`,
      );
      throw e;
    }
  }

  private async getAssetType(cryptocurrencyTicker: string): Promise<string> {
    let assetType: string = cryptocurrencyTicker;
    if (cryptocurrencyTicker.indexOf(".") > -1) {
      // Trim everything starting with the . to convert to base cryptocurrency name
      assetType = cryptocurrencyTicker.substring(0, cryptocurrencyTicker.indexOf(".") - 1);
    }

    // If the cryptocurrency isn't in the list of supported Elliptic cryptocurrencies,
    // check if it's a ERC20 chain type which is also supported
    if (!ellipticSupportedCurrencies.includes(assetType)) {
      const cryptocurrency = await this.currencyService.getCryptocurrency(cryptocurrencyTicker);
      if (cryptocurrency === null) {
        throw new Error(`Unknown Cryptocurrency: ${cryptocurrencyTicker}`); // Should never happen
      }

      if (cryptocurrency.type === CHAINTYPE_ERC20) {
        assetType = CHAINTYPE_ERC20;
      }
    }

    return assetType;
  }

  public async transactionAnalysis(transaction: Transaction): Promise<WalletExposureResponse> {
    const assetType: string = await this.getAssetType(transaction.props.leg2);

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

    const path = "/v2/analyses/synchronous";
    if (isProductionEnvironment()) {
      this.logger.info(`Posting to elliptic (${path}): ${JSON.stringify(requestBody)}`);
      try {
        const { data }: { data: EllipticTransactionAnalysisResponse } = await this.makeRequest(path, requestBody);
        return {
          riskScore: data.risk_score,
        };
      } catch (e) {
        this.logger.error(`Request to elliptic failed: Error: ${JSON.stringify(e)}`);
        throw new BadRequestException(e.message);
      }
    } else {
      this.logger.info(
        `Bypassing call to elliptic in lower environment but would've sent (${path}): ${JSON.stringify(requestBody)}`,
      );
    }
  }
}
