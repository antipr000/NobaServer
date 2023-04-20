import { Inject, Injectable } from "@nestjs/common";
import Joi from "joi";
import { WINSTON_MODULE_PROVIDER } from "nest-winston";
import { ServiceErrorCode, ServiceException } from "../../../core/exception/service.exception";
import { Logger } from "winston";
import {
  PomeloCurrency,
  PomeloEntryMode,
  PomeloOrigin,
  PomeloPointType,
  PomeloSource,
  PomeloTransactionType,
} from "../domain/PomeloTransaction";
import {
  PomeloAdjustmentType,
  PomeloTransactionAdjustmentRequest,
  PomeloTransactionAuthzRequest,
} from "../dto/pomelo.transaction.service.dto";

@Injectable()
export class PomeloWebhookMapper {
  constructor(@Inject(WINSTON_MODULE_PROVIDER) private readonly logger: Logger) {}

  convertToPomeloTransactionAuthzRequest(
    requestBody: Record<string, any>,
    headers: Record<string, any>,
  ): PomeloTransactionAuthzRequest {
    try {
      this.validateAuthzRequestHeaders(headers);
      this.validateAuthzRequestBody(requestBody);
    } catch (err) {
      this.logger.error("Transaction AuthZ request validation error: " + err.message);
      throw new ServiceException({
        errorCode: ServiceErrorCode.SEMANTIC_VALIDATION,
        message: err.message,
      });
    }

    const response: PomeloTransactionAuthzRequest = {
      endpoint: headers["x-endpoint"],
      timestamp: headers["x-timestamp"],
      rawSignature: headers["x-signature"],
      idempotencyKey: headers["x-idempotency-key"],
      rawBodyBuffer: null, // will be the responsibility of the controller layer.

      pomeloTransactionID: requestBody.transaction["id"],
      countryCode: requestBody.transaction["country_code"],
      entryMode: requestBody.transaction["entry_mode"],
      pointType: requestBody.transaction["point_type"],
      origin: requestBody.transaction["origin"],
      source: requestBody.transaction["source"],
      merchantName: requestBody.merchant["name"],
      merchantMCC: requestBody.merchant["mcc"],
      transactionType: requestBody.transaction["type"] as PomeloTransactionType,
      pomeloCardID: requestBody.card.id,
      pomeloUserID: requestBody.user.id,
      localAmount: requestBody.amount.local.total,
      localCurrency: requestBody.amount.local.currency as PomeloCurrency,
      settlementAmount: requestBody.amount.settlement.total,
      settlementCurrency: requestBody.amount.settlement.currency as PomeloCurrency,
      transactionAmount: requestBody.amount.transaction.total,
      transactionCurrency: requestBody.amount.transaction.currency as PomeloCurrency,
    };

    this.logger.info(
      `Transaction AuthZ request parameters - ReceivedBody "${JSON.stringify(
        requestBody,
      )}", ReceivedHeaders: "${JSON.stringify(headers)}", mappedRequest: "${JSON.stringify(response)}"`,
    );
    return response;
  }

  convertToPomeloTransactionAdjustmentRequest(
    requestBody: Record<string, any>,
    headers: Record<string, any>,
    adjustmentType: string,
  ): PomeloTransactionAdjustmentRequest {
    try {
      this.validateAuthzRequestHeaders(headers);
      this.validateAdjustmentType(adjustmentType);
      this.validateAdjustmentRequestBody(requestBody, adjustmentType as PomeloAdjustmentType);
    } catch (err) {
      this.logger.error("Transaction AuthZ request validation error: " + err.message);
      throw new ServiceException({
        errorCode: ServiceErrorCode.SEMANTIC_VALIDATION,
        message: err.message,
      });
    }

    const response: PomeloTransactionAdjustmentRequest = {
      endpoint: headers["x-endpoint"],
      timestamp: headers["x-timestamp"],
      rawSignature: headers["x-signature"],
      idempotencyKey: headers["x-idempotency-key"],
      rawBodyBuffer: null, // will be the responsibility of the controller layer.

      pomeloTransactionID: requestBody.transaction["id"],
      pomeloOriginalTransactionID: requestBody.transaction["original_transaction_id"],
      countryCode: requestBody.transaction["country_code"],
      entryMode: requestBody.transaction["entry_mode"],
      pointType: requestBody.transaction["point_type"],
      origin: requestBody.transaction["origin"],
      source: requestBody.transaction["source"],
      adjustmentType: adjustmentType as PomeloAdjustmentType,
      merchantName: requestBody.merchant["name"],
      merchantMCC: requestBody.merchant["mcc"],
      transactionType: requestBody.transaction["type"] as PomeloTransactionType,
      pomeloCardID: requestBody.card.id,
      pomeloUserID: requestBody.user.id,
      localAmount: requestBody.amount.local.total,
      localCurrency: requestBody.amount.local.currency as PomeloCurrency,
      settlementAmount: requestBody.amount.settlement.total,
      settlementCurrency: requestBody.amount.settlement.currency as PomeloCurrency,
      transactionAmount: requestBody.amount.transaction.total,
      transactionCurrency: requestBody.amount.transaction.currency as PomeloCurrency,
    };

    this.logger.info(
      `Transaction AuthZ request parameters - ReceivedBody "${JSON.stringify(
        requestBody,
      )}", ReceivedHeaders: "${JSON.stringify(headers)}", mappedRequest: "${JSON.stringify(response)}"`,
    );
    return response;
  }

  private validateAuthzRequestHeaders(headers: Record<string, string>) {
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

  private validateAuthzRequestBody(requestBody: Record<string, any>) {
    const pomeloTransactionAuthRawRequestJoiValidationKeys = {
      transaction: Joi.object(this.authzTransactionSubObjectValidationKeys()).required(),
      merchant: Joi.object(this.pomeloMerchantSubObjectValidationKeys()).required(),
      card: Joi.object(this.pomeloCardSubObjectValidationKeys()).required(),
      user: Joi.object(this.pomeloUserSubObjectValidationKeys()).required(),
      amount: Joi.object(this.pomeloAmountSubObjectValidationKeys()).required(),
    };

    const pomeloRawTransactionJoiSchema = Joi.object(pomeloTransactionAuthRawRequestJoiValidationKeys).options({
      allowUnknown: false,
      stripUnknown: true,
    });

    Joi.attempt(requestBody, pomeloRawTransactionJoiSchema);
  }

  private validateAdjustmentRequestBody(requestBody: Record<string, any>, adjustmentType: PomeloAdjustmentType) {
    const pomeloTransactionAuthRawRequestJoiValidationKeys = {
      transaction: Joi.object(this.adjustmentTransactionSubObjectValidationKeys(adjustmentType)).required(),
      merchant: Joi.object(this.pomeloMerchantSubObjectValidationKeys()).required(),
      card: Joi.object(this.pomeloCardSubObjectValidationKeys()).required(),
      user: Joi.object(this.pomeloUserSubObjectValidationKeys()).required(),
      amount: Joi.object(this.pomeloAmountSubObjectValidationKeys()).required(),
    };

    const pomeloRawTransactionJoiSchema = Joi.object(pomeloTransactionAuthRawRequestJoiValidationKeys).options({
      allowUnknown: false,
      stripUnknown: true,
    });

    Joi.attempt(requestBody, pomeloRawTransactionJoiSchema);
  }

  private authzTransactionSubObjectValidationKeys() {
    const internalTransactionSubObjectJoiValidationKeys = {
      id: Joi.string().required(),
      type: Joi.string()
        .required()
        .valid(
          ...[
            PomeloTransactionType.PURCHASE,
            PomeloTransactionType.EXTRACASH,
            PomeloTransactionType.WITHDRAWAL,
            // PomeloTransactionType.BALANCE_INQUIRY,  // Not valid for Columbia.
          ],
        ),
      point_type: Joi.string()
        .required()
        .valid(...Object.values(PomeloPointType)),
      entry_mode: Joi.string()
        .required()
        .valid(...Object.values(PomeloEntryMode)),
      country_code: Joi.string().required(),
      origin: Joi.string()
        .required()
        .valid(...Object.values(PomeloOrigin)),
      source: Joi.string()
        .required()
        .valid(...Object.values(PomeloSource)),
    };

    return internalTransactionSubObjectJoiValidationKeys;
  }

  private adjustmentTransactionSubObjectValidationKeys(adjustmentType: PomeloAdjustmentType) {
    const validTransactionTypes = {
      [PomeloAdjustmentType.CREDIT]: [
        PomeloTransactionType.REFUND,
        PomeloTransactionType.PAYMENT,
        PomeloTransactionType.REVERSAL_PURCHASE,
        PomeloTransactionType.REVERSAL_WITHDRAWAL,
        PomeloTransactionType.REVERSAL_EXTRACASH,
      ],
      [PomeloAdjustmentType.DEBIT]: [
        PomeloTransactionType.PURCHASE,
        PomeloTransactionType.WITHDRAWAL,
        PomeloTransactionType.EXTRACASH,
        PomeloTransactionType.REVERSAL_REFUND,
        PomeloTransactionType.REVERSAL_PAYMENT,
      ],
    };

    const internalTransactionSubObjectJoiValidationKeys = {
      id: Joi.string().required(),
      type: Joi.string()
        .required()
        .valid(...validTransactionTypes[adjustmentType]),
      original_transaction_id: Joi.string().required(),
      point_type: Joi.string()
        .required()
        .valid(...Object.values(PomeloPointType)),
      entry_mode: Joi.string()
        .required()
        .valid(...Object.values(PomeloEntryMode)),
      country_code: Joi.string().required(),
      origin: Joi.string()
        .required()
        .valid(...Object.values(PomeloOrigin)),
      source: Joi.string()
        .required()
        .valid(...Object.values(PomeloSource)),
    };

    return internalTransactionSubObjectJoiValidationKeys;
  }

  private pomeloMerchantSubObjectValidationKeys() {
    const internalMerchantSubObjectJoiValidationKeys = {
      name: Joi.string().required(),
      mcc: Joi.string().required(),
    };

    return internalMerchantSubObjectJoiValidationKeys;
  }

  private pomeloCardSubObjectValidationKeys() {
    const internalCardSubObjectJoiValidationKeys = {
      id: Joi.string().required(),
    };

    return internalCardSubObjectJoiValidationKeys;
  }

  private pomeloUserSubObjectValidationKeys() {
    const internalUserSubObjectJoiValidationKeys = {
      id: Joi.string().required(),
    };

    return internalUserSubObjectJoiValidationKeys;
  }

  private pomeloAmountSubObjectValidationKeys() {
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

  private validateAdjustmentType(adjustmentType: string) {
    const validValues: string[] = Object.values(PomeloAdjustmentType);
    if (validValues.indexOf(adjustmentType) === -1) {
      throw new ServiceException({
        errorCode: ServiceErrorCode.SEMANTIC_VALIDATION,
        message: `'adjustmentType' should be one of ${validValues}`,
      });
    }
  }
}
