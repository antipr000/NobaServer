import { Injectable } from "@nestjs/common";
import Joi from "joi";
import { Utils } from "../../../../../core/utils/Utils";
import { KeysRequired } from "../../../../common/domain/Types";
import { InputTransaction, Transaction, WorkflowName } from "../../../domain/Transaction";
import { Currency } from "../../../domain/TransactionTypes";
import { CardCreditAdjustmentTransactionRequest } from "../../../dto/transaction.service.dto";
import { TransactionProcessor } from "../transaction.processor";

@Injectable()
export class CardCreditAdjustmentProcessor implements TransactionProcessor {
  private readonly validationKeys: KeysRequired<CardCreditAdjustmentTransactionRequest> = {
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
    creditConsumerID: Joi.string().required(),
  };

  constructor() {}

  async validate(request: CardCreditAdjustmentTransactionRequest): Promise<void> {
    this.performStaticValidations(request);
    await this.performDynamicValidations(request);
  }

  async convertToRepoInputTransaction(request: CardCreditAdjustmentTransactionRequest): Promise<InputTransaction> {
    return {
      transactionRef: Utils.generateLowercaseUUID(true),
      workflowName: WorkflowName.CARD_CREDIT_ADJUSTMENT,
      debitAmount: request.debitAmount,
      debitCurrency: request.debitCurrency,
      creditAmount: request.creditAmount,
      creditCurrency: request.creditCurrency,
      creditConsumerID: request.creditConsumerID,
      memo: request.memo,
      exchangeRate: request.exchangeRate,
      sessionKey: "CARD_ADJUSTMENTS",
      transactionFees: [],
    };
  }

  async performPostProcessing(
    request: CardCreditAdjustmentTransactionRequest,
    createdTransaction: Transaction,
  ): Promise<void> {}

  private performStaticValidations(request: CardCreditAdjustmentTransactionRequest): void {
    const validationSchema = Joi.object(this.validationKeys).options({
      allowUnknown: false,
      stripUnknown: true,
    });

    Joi.attempt(request, validationSchema);
  }

  private async performDynamicValidations(request: CardCreditAdjustmentTransactionRequest): Promise<void> {}
}
