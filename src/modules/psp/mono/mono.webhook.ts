import { Inject, Injectable } from "@nestjs/common";
import { WINSTON_MODULE_PROVIDER } from "nest-winston";
import { InternalServiceErrorException } from "../../../core/exception/CommonAppException";
import { Logger } from "winston";
import { MonoCurrency } from "../domain/Mono";
import {
  BankTransferApprovedEvent,
  BankTransferRejectedEvent,
  CollectionIntentCreditedEvent,
  MonoAccountCreditedEvent,
} from "../dto/mono.webhook.dto";
import { createHmac } from "crypto";
import { CustomConfigService } from "../../../core/utils/AppConfigModule";
import { MONO_CONFIG_KEY } from "../../../config/ConfigurationUtils";
import { MonoConfigs } from "../../../config/configtypes/MonoConfig";
import { convertExternalTransactionStateToInternalState } from "./mono.utils";
import Joi from "joi";

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

    if (receivedSignature !== expectedSignature) {
      this.logger.error(
        `Received Mono signature "${receivedSignature}" and expected signature based on request body is "${expectedSignature}"`,
      );
    }

    return expectedSignature === receivedSignature;
  }

  convertCollectionLinkCredited(
    webhookData: Record<string, any>,
    monoSignature: string,
  ): CollectionIntentCreditedEvent {
    if (!this.validateSignature(webhookData, monoSignature)) {
      throw new InternalServiceErrorException({
        message: "Invalid Mono signature for 'collection_intent_credited'",
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

  convertBankTransferApproved(webhookData: Record<string, any>, monoSignature: string): BankTransferApprovedEvent {
    if (!this.validateSignature(webhookData, monoSignature)) {
      throw new InternalServiceErrorException({
        message: "Invalid Mono signature for 'bank_transfer_approved'",
      });
    }

    if (webhookData.event.type !== "bank_transfer_approved" || webhookData.event.data.state !== "approved") {
      this.logger.error("'bank_transfer_approved' state is not 'approved'.");
      this.logger.error(`Skipping webhook response: ${JSON.stringify(webhookData)}`);

      throw new InternalServiceErrorException({
        message: "Invalid 'bank_transfer_approved' webhook response.",
      });
    }

    if (webhookData.event.data.declination_reason !== null) {
      this.logger.error(
        `'bank_transfer_approved' has declination reason: ${webhookData.event.data.declination_reason}`,
      );
      this.logger.error(`Skipping webhook response: ${JSON.stringify(webhookData)}`);

      throw new InternalServiceErrorException({
        message: "Invalid 'bank_transfer_approved' webhook response.",
      });
    }

    return {
      accountID: webhookData.event.data.batch.account_id,
      amount: webhookData.event.data.amount.amount,
      currency: webhookData.event.data.amount.currency as MonoCurrency,
      batchID: webhookData.event.data.batch.id,
      transferID: webhookData.event.data.id,
    };
  }

  convertBankTransferRejected(webhookData: Record<string, any>, monoSignature: string): BankTransferRejectedEvent {
    if (!this.validateSignature(webhookData, monoSignature)) {
      throw new InternalServiceErrorException({
        message: "Invalid Mono signature for 'bank_transfer_rejected'",
      });
    }

    if (webhookData.event.type !== "bank_transfer_rejected") {
      this.logger.error("Event is not of type 'bank_transfer_rejected'.");
      this.logger.error(`Skipping webhook response: ${JSON.stringify(webhookData)}`);

      throw new InternalServiceErrorException({
        message: "Invalid 'bank_transfer_rejected' webhook response.",
      });
    }

    if (webhookData.event.data.declination_reason === null) {
      this.logger.error(`'bank_transfer_rejected' doesn't have declination_reason`);
      this.logger.error(`Skipping webhook response: ${JSON.stringify(webhookData)}`);

      throw new InternalServiceErrorException({
        message: "Invalid 'bank_transfer_rejected' webhook response.",
      });
    }

    return {
      accountID: webhookData.event.data.batch.account_id,
      amount: webhookData.event.data.amount.amount,
      currency: webhookData.event.data.amount.currency as MonoCurrency,
      batchID: webhookData.event.data.batch.id,
      transferID: webhookData.event.data.id,
      state: convertExternalTransactionStateToInternalState(webhookData.event.data.state),
      declinationReason: webhookData.event.data.declination_reason,
    };
  }

  convertAccountCredited(webhookData: Record<string, any>, monoSignature: string): MonoAccountCreditedEvent {
    if (!this.validateSignature(webhookData, monoSignature)) {
      throw new InternalServiceErrorException({
        message: "Invalid Mono signature for 'account_credited'",
      });
    }

    try {
      this.validateAccountCreditedWebhookEvent(webhookData);
    } catch (err) {
      this.logger.error("Event doesn't contains all the fields required for 'account_credited'.");
      this.logger.error(`Skipping webhook response: ${JSON.stringify(webhookData)}`);

      throw new InternalServiceErrorException({
        message: `Invalid 'account_credited' webhook response - "${err.message}"`,
      });
    }

    return {
      accountID: webhookData.event.data.account.id,
      accountNumber: webhookData.event.data.account.number,
      amount: webhookData.event.data.amount.amount,
      currency: webhookData.event.data.amount.currency as MonoCurrency,
      transactionID: webhookData.event.data.id,
      payerDocumentNumber: webhookData.event.data.payer.document_number,
      payerName: webhookData.event.data.payer.name,
      description: webhookData.event.data.description,
    };
  }

  private validateAccountCreditedWebhookEvent(webhookData: Record<string, any>) {
    const joiValidationKeysForAccountSubObject = {
      id: Joi.string().required(),
      number: Joi.string().required(),
    };
    const joiValidationKeysForAmountSubObject = {
      amount: Joi.number().required(),
      currency: Joi.string()
        .required()
        .valid(...Object.values(MonoCurrency)),
    };
    const joiValidationKeysForPayerSubObject = {
      document_number: Joi.string().required(),
      name: Joi.string().required(),
    };
    const joiValidationKeysForDataSubObject = {
      account: Joi.object(joiValidationKeysForAccountSubObject).required(),
      amount: Joi.object(joiValidationKeysForAmountSubObject).required(),
      description: Joi.string().required(),
      id: Joi.string().required(),
      payer: Joi.object(joiValidationKeysForPayerSubObject).required(),
      transaction_at: Joi.string().required(),
    };
    const eventValidationKeys = {
      data: Joi.object(joiValidationKeysForDataSubObject).required(),
      type: Joi.string().required().valid("account_credited"),
    };

    const joiSchema = Joi.object({
      event: Joi.object(eventValidationKeys).required(),
    }).options({
      allowUnknown: false,
      stripUnknown: true,
    });
    Joi.attempt(webhookData, joiSchema);
  }
}
