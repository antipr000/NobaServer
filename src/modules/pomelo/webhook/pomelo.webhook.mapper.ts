import { Inject, Injectable } from "@nestjs/common";
import Joi from "joi";
import { WINSTON_MODULE_PROVIDER } from "nest-winston";
import { ServiceErrorCode, ServiceException } from "../../../core/exception/service.exception";
import { Logger } from "winston";
import { PomeloCurrency } from "../domain/PomeloTransaction";
import {
  PomeloTransactionAuthzRequest,
  PomeloTransactionAuthzResponse,
  PomeloTransactionType,
} from "../dto/pomelo.transaction.service.dto";

@Injectable()
export class PomeloWebhookMapper {
  constructor(@Inject(WINSTON_MODULE_PROVIDER) private readonly logger: Logger) {}

  convertToPomeloTransactionAuthzRequest(
    requestBody: Record<string, any>,
    headers: Record<string, any>,
  ): PomeloTransactionAuthzRequest {
    try {
      this.validateTransactionAuthzRequestHeaders(headers);
      this.validateTransactionAuthzRequestBody(requestBody);
    } catch (err) {
      this.logger.error("Transaction AuthZ request validation error: " + err.message);
      throw new ServiceException({
        errorCode: ServiceErrorCode.SEMANTIC_VALIDATION,
        message: err.message,
      });
    }

    const endpoint: string = headers["x-endpoint"];
    const timestamp: string = headers["x-timestamp"];
    const signature: string = headers["x-signature"];
    const idempotencyKey: string = headers["x-idempotency-key"];

    const response: PomeloTransactionAuthzRequest = {
      endpoint: endpoint,
      timestamp: timestamp,
      rawSignature: signature,
      rawBodyBuffer: null, // will be the responsibility of the controller layer.
      idempotencyKey: idempotencyKey,

      pomeloTransactionID: requestBody.transaction["id"],
      transactionType: requestBody.transaction["type"] as PomeloTransactionType,
      pomeloOriginalTransactionID: requestBody.transaction["original_transaction_id"],
      pomeloCardID: requestBody.card.id,
      pomeloUserID: requestBody.user.id,
      localAmount: requestBody.amount.local.total,
      localCurrency: requestBody.amount.local.currency as PomeloCurrency,
      settlementAmount: requestBody.amount.settlement.total,
      settlementCurrency: requestBody.amount.settlement.currency as PomeloCurrency,
    };

    this.logger.info(
      `Transaction AuthZ request parameters - ReceivedBody "${JSON.stringify(
        requestBody,
      )}", ReceivedHeaders: "${JSON.stringify(headers)}", mappedRequest: "${JSON.stringify(response)}"`,
    );
    return response;
  }

  private validateTransactionAuthzRequestHeaders(headers: Record<string, string>) {
    const transactionAuthzRequestHeadersJoiValidationKeys = {
      "x-endpoint": Joi.string().required(),
      "x-timestamp": Joi.string().required(),
      "x-signature": Joi.string().required(),
      "x-idempotency-key": Joi.string().required(),
    };

    const pomeloTransactionHeadersJoiSchema = Joi.object(transactionAuthzRequestHeadersJoiValidationKeys).options({
      allowUnknown: false,
      stripUnknown: true,
    });

    Joi.attempt(headers, pomeloTransactionHeadersJoiSchema);
  }

  private validateTransactionAuthzRequestBody(requestBody: Record<string, any>) {
    const pomeloTransactionAuthRawRequestJoiValidationKeys = {
      transaction: Joi.object(this.transactionAuthzTransactionSubObjectValidationKeys()).required(),
      card: Joi.object(this.transactionAuthzCardSubObjectValidationKeys()).required(),
      user: Joi.object(this.transactionAuthzUserSubObjectValidationKeys()).required(),
      amount: Joi.object(this.transactionAuthzAmountSubObjectValidationKeys()).required(),
    };

    const pomeloRawTransactionJoiSchema = Joi.object(pomeloTransactionAuthRawRequestJoiValidationKeys).options({
      allowUnknown: false,
      stripUnknown: true,
    });

    Joi.attempt(requestBody, pomeloRawTransactionJoiSchema);
  }

  private transactionAuthzTransactionSubObjectValidationKeys() {
    const internalTransactionSubObjectJoiValidationKeys = {
      id: Joi.string().required(),
      type: Joi.string()
        .required()
        .valid(...Object.values(PomeloTransactionType)),
      original_transaction_id: Joi.string().optional().allow(null),
    };

    return internalTransactionSubObjectJoiValidationKeys;
  }

  private transactionAuthzCardSubObjectValidationKeys() {
    const internalCardSubObjectJoiValidationKeys = {
      id: Joi.string().required(),
    };

    return internalCardSubObjectJoiValidationKeys;
  }

  private transactionAuthzUserSubObjectValidationKeys() {
    const internalUserSubObjectJoiValidationKeys = {
      id: Joi.string().required(),
    };

    return internalUserSubObjectJoiValidationKeys;
  }

  private transactionAuthzAmountSubObjectValidationKeys() {
    const internalIndividualAmountSubObjectJoiValidationKeys = {
      total: Joi.number().required().greater(0),
      currency: Joi.string()
        .required()
        .valid(...Object.values(PomeloCurrency)),
    };

    const internalAmountSubObjectValidationKeys = {
      local: Joi.object(internalIndividualAmountSubObjectJoiValidationKeys).required(),
      transaction: Joi.object(internalIndividualAmountSubObjectJoiValidationKeys).required(),
      settlement: Joi.object(internalIndividualAmountSubObjectJoiValidationKeys).required(),
    };

    return internalAmountSubObjectValidationKeys;
  }
}
