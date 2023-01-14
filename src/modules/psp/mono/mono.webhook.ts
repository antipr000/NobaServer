import { Inject, Injectable } from "@nestjs/common";
import { WINSTON_MODULE_PROVIDER } from "nest-winston";
import { InternalServiceErrorException } from "../../../core/exception/CommonAppException";
import { Logger } from "winston";
import { MonoCurrency } from "../domain/Mono";
import { CollectionIntentCreditedEvent } from "../dto/mono.webhook.dto";
import { createHmac } from "crypto";
import { CustomConfigService } from "../../../core/utils/AppConfigModule";
import { MONO_CONFIG_KEY } from "../../../config/ConfigurationUtils";
import { MonoConfigs } from "../../../config/configtypes/MonoConfig";

@Injectable()
export class MonoWebhookHandlers {
  private monoWebhookSecret: string;

  constructor(
    @Inject(WINSTON_MODULE_PROVIDER) private readonly logger: Logger,
    private readonly configService: CustomConfigService,
  ) {
    this.monoWebhookSecret = this.configService.get<MonoConfigs>(MONO_CONFIG_KEY).webhookSecret;
  }

  private validateSignature(webhookData: any, monoSignature: string): boolean {
    const parts = monoSignature.split(",");
    const receivedTimestamp = parts[0].substring(2); // t=123456789
    const receivedSignature = parts[1].substring(3); // v1=123456789

    const payload = `${receivedTimestamp}.${JSON.stringify(webhookData ? webhookData : {})}`;
    const expectedSignature = createHmac("sha256", this.monoWebhookSecret).update(payload).digest("hex");

    this.logger.info(
      `Received signature "${receivedSignature}" and expected signature based on request body is "${expectedSignature}"`,
    );
    return expectedSignature === receivedSignature;
  }

  convertCollectionLinkCredited(
    webhookData: Record<string, any>,
    monoSignature: string,
  ): CollectionIntentCreditedEvent {
    if (!this.validateSignature(webhookData, monoSignature)) {
      throw new InternalServiceErrorException({
        message: "Invalid Mono signature",
      });
    }

    if (
      webhookData.event.type !== "collection_intent_credited" ||
      webhookData.event.data.state !== "account_credited"
    ) {
      this.logger.error("'collection_intent_credited' state is not 'account_credited'.");
      this.logger.error(`Skipping webhook response: ${JSON.stringify(webhookData)}`);

      throw new InternalServiceErrorException({
        message: "Invalid 'collection_intent_credited' webhook response.",
      });
    }

    return {
      accountID: webhookData.event.data.account_id,
      amount: webhookData.event.data.amount.amount,
      currency: webhookData.event.data.amount.currency as MonoCurrency,
      collectionLinkID: webhookData.event.data.collection_link_id,
      monoTransactionID: webhookData.event.data.payment.transaction_id,
    };
  }
}
