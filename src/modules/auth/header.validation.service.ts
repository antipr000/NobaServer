import { BadRequestException, Inject, Injectable, Logger } from "@nestjs/common";
import { WINSTON_MODULE_PROVIDER } from "nest-winston";
import { PartnerService } from "../partner/partner.service";
import { Partner } from "../partner/domain/Partner";
import * as CryptoJS from "crypto-js";
import { HmacSHA256 } from "crypto-js";
import { AppEnvironment, getEnvironmentName } from "../../config/ConfigurationUtils";

@Injectable()
export class HeaderValidationService {
  @Inject(WINSTON_MODULE_PROVIDER)
  private readonly logger: Logger;

  @Inject() partnerService: PartnerService;

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
    const timestampDate = new Date(timestamp);

    if (isNaN(timestampDate.getTime()) || !timestamp) {
      throw new BadRequestException("Timestamp is not a correct timestamp");
    }
    const minutes = Math.abs((dateNow.getTime() - timestampDate.getTime()) / 60000);
    if (minutes > 5) {
      throw new BadRequestException("Timestamp is more than 5 minutes older");
    }
    try {
      const partner: Partner = await this.partnerService.getPartnerFromApiKey(apiKey);
      const secretKey = CryptoJS.enc.Utf8.parse(partner.props.secretKey);
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
      throw new BadRequestException("Failed to validate headers. Reason: " + e.message);
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
