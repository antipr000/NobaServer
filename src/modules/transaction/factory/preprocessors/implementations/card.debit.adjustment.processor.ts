import { Injectable } from "@nestjs/common";
import Joi from "joi";
import { Utils } from "../../../../../core/utils/Utils";
import { KeysRequired } from "../../../../common/domain/Types";
import { InputTransaction, WorkflowName } from "../../../domain/Transaction";
import { Currency } from "../../../domain/TransactionTypes";
import { CardDebitAdjustmentTransactionRequest } from "../../../dto/transaction.service.dto";
import { TransactionProcessor } from "../transaction.processor";

@Injectable()
export class CardDebitAdjustmentProcessor implements TransactionProcessor {
  private readonly validationKeys: KeysRequired<CardDebitAdjustmentTransactionRequest> = {
    creditAmount: Joi.number().required(),
    creditCurrency: Joi.string()
      .required()
      .valid(...Object.values(Currency)),
    debitAmount: Joi.number().required(),
    debitCurrency: Joi.string()
      .required()
      .valid(...Object.values(Currency)),
    exchangeRate: Joi.number().required(),
    memo: Joi.string().required(),
    debitConsumerID: Joi.string().required(),
  };

  constructor() {}

  async validate(request: CardDebitAdjustmentTransactionRequest): Promise<void> {
    this.performStaticValidations(request);
    await this.performDynamicValidations(request);
  }

  async convertToRepoInputTransaction(request: CardDebitAdjustmentTransactionRequest): Promise<InputTransaction> {
    return {
      transactionRef: Utils.generateLowercaseUUID(true),
      workflowName: WorkflowName.CARD_DEBIT_ADJUSTMENT,
      debitAmount: request.debitAmount,
      debitCurrency: request.debitCurrency,
      creditAmount: request.creditAmount,
      creditCurrency: request.creditCurrency,
      debitConsumerID: request.debitConsumerID,
      memo: request.memo,
      exchangeRate: request.exchangeRate,
      sessionKey: "CARD_ADJUSTMENTS",
      transactionFees: [],
    };
  }

  private performStaticValidations(request: CardDebitAdjustmentTransactionRequest): void {
    const validationSchema = Joi.object(this.validationKeys).options({
      allowUnknown: false,
      stripUnknown: true,
    });

    Joi.attempt(request, validationSchema);
  }

  private async performDynamicValidations(request: CardDebitAdjustmentTransactionRequest): Promise<void> {}
}
