import { Injectable } from "@nestjs/common";
import Joi from "joi";
import { Utils } from "../../../../../core/utils/Utils";
import { KeysRequired } from "../../../../../modules/common/domain/Types";
import { InputTransaction, WorkflowName } from "../../../../../modules/transaction/domain/Transaction";
import { Currency } from "../../../../../modules/transaction/domain/TransactionTypes";
import { CardCreditAdjustmentTransactionRequest } from "../../../../../modules/transaction/dto/transaction.service.dto";
import { TransactionPreprocessor } from "../transaction.preprocessor";

@Injectable()
export class CardCreditAdjustmentPreprocessor implements TransactionPreprocessor {
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

  private performStaticValidations(request: CardCreditAdjustmentTransactionRequest): void {
    const validationSchema = Joi.object(this.validationKeys).options({
      allowUnknown: false,
      stripUnknown: true,
    });

    Joi.attempt(request, validationSchema);
  }

  private async performDynamicValidations(request: CardCreditAdjustmentTransactionRequest): Promise<void> {}
}
