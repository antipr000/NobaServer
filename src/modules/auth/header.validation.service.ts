import { BadRequestException, ForbiddenException, Inject, Injectable, Logger } from "@nestjs/common";
import { WINSTON_MODULE_PROVIDER } from "nest-winston";
import { PartnerService } from "../partner/partner.service";
import { Partner } from "../partner/domain/Partner";
import CryptoJS from "crypto-js";
import { HmacSHA256 } from "crypto-js";
import { AppEnvironment, getEnvironmentName, PARTNER_CONFIG_KEY } from "../../config/ConfigurationUtils";
import { CustomConfigService } from "../../core/utils/AppConfigModule";
import { PartnerConfigs } from "../../config/configtypes/PartnerConfigs";

@Injectable()
export class HeaderValidationService {
  @Inject(WINSTON_MODULE_PROVIDER)
  private readonly logger: Logger;

  @Inject() partnerService: PartnerService;

  private readonly embedSecretKey: string;

  constructor(configService: CustomConfigService) {
    this.embedSecretKey = configService.get<PartnerConfigs>(PARTNER_CONFIG_KEY).embedSecretKey;
  }

  async validateApiKeyAndSignature(
    apiKey: string,
    timestamp: string,
    signature: string,
    requestMethod: string,
    requestPath: string,
    requestBody: string,
  ): Promise<boolean> {
    if (!this.shouldValidateHeaders(apiKey, timestamp, signature)) return true;
    const dateNow = new Date();
    const timestampDate = new Date(parseInt(timestamp));
    if (isNaN(timestampDate.getTime()) || !timestamp) {
      throw new BadRequestException("Timestamp is not a correct timestamp");
    }
    const minutes = Math.abs(dateNow.getTime() - timestampDate.getTime()) / 60000;
    if (minutes > 5.0) {
      throw new BadRequestException("Timestamp is more than 5 minutes different than expected");
    }
    try {
      const partner: Partner = await this.partnerService.getPartnerFromApiKey(apiKey);
      if (
        (partner.props.apiKeyForEmbed === apiKey && !partner.props.isEmbedEnabled) ||
        (partner.props.apiKey === apiKey && !partner.props.isAPIEnabled)
      ) {
        throw new ForbiddenException(
          `Integration for ${partner.props.apiKey === apiKey ? "API" : "EMBED"} is not enabled`,
        );
      }
      const secretKey =
        partner.props.apiKey === apiKey
          ? CryptoJS.enc.Utf8.parse(partner.props.secretKey)
          : CryptoJS.enc.Utf8.parse(this.embedSecretKey);
      const signatureString = CryptoJS.enc.Utf8.parse(
        `${timestamp}${apiKey}${requestMethod}${requestPath}${requestBody}`,
      );
      const hmacSignatureString = CryptoJS.enc.Hex.stringify(HmacSHA256(signatureString, secretKey));
      if (hmacSignatureString !== signature) {
        this.logger.error(`Signature mismatch. Signature: ${hmacSignatureString}, Expected: ${signature}, 
        timestamp: ${timestamp}, requestMethod: ${requestMethod}, requestPath: ${requestPath}, requestBody: ${requestBody}`);
        throw new BadRequestException("Signature does not match");
      }
      return true;
    } catch (e) {
      this.logger.error(e);
      throw e;
    }
  }

  private shouldValidateHeaders(apiKey: string, timestamp: string, signature: string) {
    const appEnvironment: AppEnvironment = getEnvironmentName();

    if (appEnvironment === AppEnvironment.PROD) {
      return true;
    } else if (apiKey && timestamp && signature) {
      return true;
    }

    return false;
  }
}
