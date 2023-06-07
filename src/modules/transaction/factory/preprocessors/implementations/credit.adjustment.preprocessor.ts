import { Injectable } from "@nestjs/common";
import Joi from "joi";
import { Utils } from "../../../../../core/utils/Utils";
import { KeysRequired } from "../../../../../modules/common/domain/Types";
import { InputTransaction, WorkflowName } from "../../../../../modules/transaction/domain/Transaction";
import { Currency } from "../../../../../modules/transaction/domain/TransactionTypes";
import { CreditAdjustmentTransactionRequest } from "../../../../../modules/transaction/dto/transaction.service.dto";
import { TransactionPreprocessor } from "../transaction.preprocessor";

@Injectable()
export class CreditAdjustmentPreprocessor implements TransactionPreprocessor {
  private readonly validationKeys: KeysRequired<CreditAdjustmentTransactionRequest> = {
    creditConsumerID: Joi.string().required(),
    creditAmount: Joi.number().required(),
    creditCurrency: Joi.string()
      .required()
      .valid(...Object.values(Currency)),
    memo: Joi.string().required(),
  };

  constructor() {}

  async validate(request: CreditAdjustmentTransactionRequest): Promise<void> {
    this.performStaticValidations(request);
    await this.performDynamicValidations(request);
  }

  async convertToRepoInputTransaction(request: CreditAdjustmentTransactionRequest): Promise<InputTransaction> {
    return {
      workflowName: WorkflowName.CREDIT_ADJUSTMENT,
      exchangeRate: 1,
      memo: request.memo,
      transactionRef: Utils.generateLowercaseUUID(true),
      transactionFees: [],
      sessionKey: WorkflowName.CREDIT_ADJUSTMENT,
      creditAmount: request.creditAmount,
      creditCurrency: request.creditCurrency,
      creditConsumerID: request.creditConsumerID,
      debitAmount: request.creditAmount,
      debitCurrency: request.creditCurrency,
    };
  }

  private performStaticValidations(request: CreditAdjustmentTransactionRequest): void {
    const validationSchema = Joi.object(this.validationKeys).options({
      allowUnknown: false,
      stripUnknown: true,
    });

    Joi.attempt(request, validationSchema);
  }

  private async performDynamicValidations(request: CreditAdjustmentTransactionRequest): Promise<void> {}
}
