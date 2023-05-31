import { Inject, Injectable } from "@nestjs/common";
import axios, { AxiosResponse } from "axios";
import { createHmac } from "crypto";
import { WINSTON_MODULE_PROVIDER } from "nest-winston";
import { Logger } from "winston";
import { EllipticConfigs } from "../../config/configtypes/EllipticConfig";
import { ELLIPTIC_CONFIG_KEY } from "../../config/ConfigurationUtils";
import { CustomConfigService } from "../../core/utils/AppConfigModule";
import { Transaction } from "../transaction/domain/Transaction";
import { CurrencyService } from "./currency.service";
import { WalletExposureResponse } from "./domain/WalletExposureResponse";
import { AlertService } from "./alerts/alert.service";

@Injectable()
export class EllipticService {
  @Inject(WINSTON_MODULE_PROVIDER) private readonly logger: Logger;

  private apiKey: string;
  private secretKey: string;
  private baseUrl: string;

  @Inject()
  private readonly alertService: AlertService;

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
      this.alertService.raiseError(
        `Error with Elliptic POST ${requestPath} API call with payload ${JSON.stringify(requestBody)}. ${JSON.stringify(
          e,
        )}`,
      );
      throw e;
    }
  }

  public async transactionAnalysis(transaction: Transaction): Promise<WalletExposureResponse> {
    throw new Error("Elliptic is not supported in this version of Noba");
  }
}
